export function createQueueService(
  database,
  handlers,
  intervalMs = Number(process.env.QUEUE_INTERVAL_MS || 3000),
  concurrency = Number(process.env.QUEUE_CONCURRENCY || 2)
) {
  const activeJobIds = new Set();
  let timer = null;

  async function processNextJobs() {
    const availableSlots = Math.max(0, concurrency - activeJobIds.size);
    if (!availableSlots) return [];

    const jobs = database.fetchQueuedJobs(availableSlots);
    const results = [];

    await Promise.all(
      jobs.map(async (job) => {
        if (activeJobIds.has(job.id)) return;

        const running = database.markJobRunning(job.id);
        if (!running || running.status !== "running") return;

        activeJobIds.add(job.id);

        try {
          const handler = handlers[job.type];
          if (!handler) throw new Error(`No handler for job type ${job.type}`);
          const result = await handler(job);
          database.markJobCompleted(job.id, result);
          results.push({ jobId: job.id, status: "completed", result });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Job failed.";
          database.markJobFailed(job.id, message);
          results.push({ jobId: job.id, status: "failed", error: message });
        } finally {
          activeJobIds.delete(job.id);
        }
      })
    );

    return results;
  }

  function enqueue(job) {
    return database.enqueueJob(job);
  }

  function start() {
    timer = setInterval(() => {
      processNextJobs().catch((error) => {
        console.error("Queue worker failed:", error);
      });
    }, intervalMs);

    setTimeout(() => {
      processNextJobs().catch((error) => {
        console.error("Initial queue run failed:", error);
      });
    }, 1200);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    intervalMs,
    concurrency,
    enqueue,
    processNextJobs,
    start,
    stop
  };
}
