import crypto from "crypto";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function hashBlog(blog) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify([blog.title, blog.excerpt, blog.html, blog.keyword]))
    .digest("hex");
}

function buildWordPressAuth(username, applicationPassword) {
  return `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString("base64")}`;
}

async function ensureResponseOk(response, platform) {
  if (response.ok) return;
  const message = await response.text();
  throw new Error(`${platform} publish failed: ${response.status} ${message}`);
}

async function createOrUpdateWordPressPost(target, mapping, blog, contentHash) {
  const config = target.config || {};
  const baseUrl = String(config.baseUrl || "").replace(/\/$/, "");
  const username = String(config.username || "");
  const applicationPassword = String(config.applicationPassword || "");
  const postStatus = String(config.status || "draft");

  if (!baseUrl || !username || !applicationPassword) {
    throw new Error("WordPress target requires baseUrl, username and applicationPassword.");
  }

  if (mapping && mapping.contentHash === contentHash) {
    return {
      mode: "noop",
      externalItemId: mapping.externalItemId,
      externalUrl: mapping.externalUrl || null
    };
  }

  const endpoint = mapping
    ? `${baseUrl}/wp-json/wp/v2/posts/${mapping.externalItemId}`
    : `${baseUrl}/wp-json/wp/v2/posts`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: buildWordPressAuth(username, applicationPassword),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: blog.title,
      excerpt: blog.excerpt,
      content: blog.html,
      status: postStatus,
      slug: `${slugify(blog.title)}-${blog.id}`
    })
  });

  await ensureResponseOk(response, "WordPress");
  const post = await response.json();

  return {
    mode: mapping ? "updated" : "created",
    externalItemId: String(post.id),
    externalUrl: post.link || null
  };
}

async function createOrUpdateWebflowItem(target, mapping, blog, contentHash) {
  const config = target.config || {};
  const token = String(config.token || "");
  const collectionId = String(config.collectionId || "");
  const titleField = String(config.titleField || "name");
  const slugField = String(config.slugField || "slug");
  const contentField = String(config.contentField || "post-body");
  const excerptField = String(config.excerptField || "summary");
  const keywordField = String(config.keywordField || "keyword");

  if (!token || !collectionId) {
    throw new Error("Webflow target requires token and collectionId.");
  }

  if (mapping && mapping.contentHash === contentHash) {
    return {
      mode: "noop",
      externalItemId: mapping.externalItemId,
      externalUrl: mapping.externalUrl || null
    };
  }

  const item = {
    fieldData: {
      [titleField]: blog.title,
      [slugField]: `${slugify(blog.title)}-${blog.id}`,
      [contentField]: blog.html,
      [excerptField]: blog.excerpt,
      [keywordField]: blog.keyword
    }
  };

  const url = mapping
    ? `https://api.webflow.com/v2/collections/${collectionId}/items/live?skipInvalidFiles=true`
    : `https://api.webflow.com/v2/collections/${collectionId}/items/live?skipInvalidFiles=true`;
  const method = mapping ? "PATCH" : "POST";
  const payload = mapping
    ? {
        items: [
          {
            id: mapping.externalItemId,
            ...item
          }
        ]
      }
    : {
        items: [
          {
            isArchived: false,
            isDraft: false,
            ...item
          }
        ]
      };

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  await ensureResponseOk(response, "Webflow");
  const result = await response.json();
  const createdItem = Array.isArray(result.items) ? result.items[0] : result.items?.[0] || result.items || result;
  const externalItemId = String(createdItem?.id || mapping?.externalItemId || "");
  const externalUrl = createdItem?.fieldData?.slug ? `${config.siteUrl || ""}/${createdItem.fieldData.slug}` : null;

  return {
    mode: mapping ? "updated" : "created",
    externalItemId,
    externalUrl
  };
}

export function createPublishService(database) {
  async function publishToTarget(target, client) {
    const results = [];

    for (const blog of client.blogs) {
      const contentHash = hashBlog(blog);
      const mapping = database.getPublishMapping(target.id, blog.id);

      let publishResult;
      if (target.platform === "wordpress") {
        publishResult = await createOrUpdateWordPressPost(target, mapping, blog, contentHash);
      } else if (target.platform === "webflow") {
        publishResult = await createOrUpdateWebflowItem(target, mapping, blog, contentHash);
      } else {
        throw new Error(`Unsupported platform: ${target.platform}`);
      }

      if (publishResult.mode !== "noop") {
        database.upsertPublishMapping(target.id, blog.id, {
          externalItemId: publishResult.externalItemId,
          externalUrl: publishResult.externalUrl,
          contentHash
        });
      }

      results.push({
        blogPostId: blog.id,
        title: blog.title,
        ...publishResult
      });
    }

    return results;
  }

  async function publishClient(client, targets) {
    const results = [];

    for (const target of targets) {
      try {
        const items = await publishToTarget(target, client);
        const counts = items.reduce(
          (acc, item) => {
            acc[item.mode] = (acc[item.mode] || 0) + 1;
            return acc;
          },
          { created: 0, updated: 0, noop: 0 }
        );

        database.recordPublishRun(client.id, target.id, {
          status: "success",
          message: `Publish sync finished for ${target.platform}.`,
          payload: {
            platform: target.platform,
            counts,
            items
          }
        });

        results.push({
          targetId: target.id,
          status: "success",
          platform: target.platform,
          counts,
          items
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Publish failed.";
        database.recordPublishRun(client.id, target.id, {
          status: "failed",
          message,
          payload: null
        });
        results.push({
          targetId: target.id,
          status: "failed",
          message
        });
      }
    }

    return results;
  }

  return {
    publishClient
  };
}
