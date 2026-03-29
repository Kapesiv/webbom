export function createScheduler(
  database,
  enqueueJob,
  intervalMs = Number(process.env.SCHEDULER_INTERVAL_MS || 60000)
) {
  let timer = null;

  function ensureDueGenerationJobs(limit = 10) {
    const dueClients = database.listDueClients(limit);
    const results = [];

    for (const client of dueClients) {
      const job = enqueueJob({
        agencyId: client.agency_id,
        clientId: client.id,
        type: "generate_client",
        payload: {
          mode: "scheduled"
        }
      });

      results.push({
        clientId: client.id,
        businessName: client.business_name,
        jobId: job.id,
        status: "queued"
      });
    }

    return results;
  }

  function start() {
    timer = setInterval(() => {
      try {
        ensureDueGenerationJobs();
      } catch (error) {
        console.error("Scheduler tick failed:", error);
      }
    }, intervalMs);

    setTimeout(() => {
      try {
        ensureDueGenerationJobs();
      } catch (error) {
        console.error("Initial scheduler tick failed:", error);
      }
    }, 1500);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    intervalMs,
    ensureDueGenerationJobs,
    start,
    stop
  };
}
