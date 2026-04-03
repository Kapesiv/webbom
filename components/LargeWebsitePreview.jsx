function truncateText(value, maxLength = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export function buildLargeWebsitePreviewProps(client) {
  const website = client?.website || {};
  const strategy = client?.strategyRecommendation || {};
  const profile = client?.businessProfile || {};
  const siteName = client?.businessName || "Lumix";
  const slug =
    client?.seo?.slug ||
    siteName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/gi, "")
      .replace(/\s+/g, "-");

  const contentAngles = Array.isArray(strategy.contentAngles) ? strategy.contentAngles : [];
  const homepageStructure = Array.isArray(strategy.homepageStructure)
    ? strategy.homepageStructure
    : ["Hero", "Offer", "Proof", "CTA", "Footer"];
  const blogs = Array.isArray(client?.blogs) ? client.blogs : [];

  return {
    siteName,
    url: `${slug || "preview"}.lumix.site`,
    headline: website.headline || strategy.positioning || siteName,
    subheadline:
      website.subheadline ||
      strategy.ctaStrategy ||
      client?.description ||
      "Lumix creates a clear website direction from your business context.",
    primaryCta: website.cta || profile.mainCta || "Book a strategy call",
    secondaryCta: "See full preview",
    features: [
      {
        title: homepageStructure[1] || "Offer",
        description:
          truncateText(contentAngles[0], 110) ||
          "Shape the offer into a clear, conversion-ready section."
      },
      {
        title: homepageStructure[2] || "Proof",
        description:
          truncateText(contentAngles[1], 110) ||
          "Support the message with trust, proof, and supporting context."
      },
      {
        title: homepageStructure[3] || "CTA",
        description:
          truncateText(contentAngles[2], 110) ||
          "Guide the visitor into one clear next action."
      }
    ],
    testimonials: [
      {
        quote:
          truncateText(
            blogs[0]?.excerpt ||
              strategy.positioning ||
              "This preview turns strategy into a more credible and polished website direction.",
            140
          ),
        name: strategy.primaryAudience || "Ideal audience",
        role: strategy.primaryOffer || "Primary offer"
      }
    ],
    footerLinks: ["Overview", "Offer", "Proof", "SEO", "Contact"]
  };
}

// Usage:
// <LargeWebsitePreview {...buildLargeWebsitePreviewProps(client)} />

export default function LargeWebsitePreview({
  siteName = "Lumix",
  url = "preview.lumix.ai",
  headline = "Build a sharper online presence that actually converts.",
  subheadline = "Lumix turns your business context into a focused website, strategic content, and SEO structure in one premium workflow.",
  primaryCta = "Book a strategy call",
  secondaryCta = "See how it works",
  features = [
    {
      title: "Clear positioning",
      description: "Turn messy business ideas into a strong offer, message, and conversion path."
    },
    {
      title: "Content engine",
      description: "Generate landing pages, blog content, and supporting SEO assets from one brief."
    },
    {
      title: "Publish-ready output",
      description: "Review the final package in one place before sending it live."
    }
  ],
  testimonials = [
    {
      quote:
        "Lumix gave us a website direction that felt clearer than weeks of manual back-and-forth.",
      name: "Anna Lehtinen",
      role: "Founder, Nordic Atelier"
    }
  ],
  footerLinks = ["Product", "Preview", "SEO", "Contact"]
}) {
  return (
    <div className="flex justify-center px-4 py-8 lg:px-8">
      <div className="w-full max-w-[1220px]">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0f15] shadow-[0_30px_90px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
          <div className="flex items-center gap-4 border-b border-white/10 bg-[#0f141c] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-center text-[12px] font-medium tracking-[0.08em] text-slate-400">
              {url}
            </div>
          </div>

          <div className="max-h-[78vh] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(80,140,255,0.12),transparent_28%),linear-gradient(180deg,#0b0f15_0%,#0d1219_100%)]">
            <div className="mx-auto w-full max-w-[1180px] px-6 py-8 sm:px-8 lg:px-12 lg:py-12">
              <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.14),transparent_24%)]" />
                <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-[760px]">
                    <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                      <span className="h-2 w-2 rounded-full bg-sky-300" />
                      {siteName} preview
                    </div>
                    <h1 className="max-w-[12ch] text-balance text-[42px] font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-[56px] lg:text-[78px]">
                      {headline}
                    </h1>
                    <p className="mt-6 max-w-[58ch] text-[16px] leading-8 text-slate-300 sm:text-[18px]">
                      {subheadline}
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-white px-6 text-[15px] font-semibold text-slate-950 shadow-[0_14px_30px_rgba(255,255,255,0.12)] transition hover:bg-slate-100"
                      >
                        {primaryCta}
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/12 bg-white/[0.02] px-6 text-[15px] font-semibold text-white transition hover:bg-white/[0.05]"
                      >
                        {secondaryCta}
                      </button>
                    </div>
                  </div>

                  <div className="grid w-full max-w-[360px] gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Stage
                      </div>
                      <div className="mt-3 text-[26px] font-semibold tracking-[-0.04em] text-white">
                        Live preview
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Assets
                      </div>
                      <div className="mt-3 text-[26px] font-semibold tracking-[-0.04em] text-white">
                        Landing + SEO
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Workflow
                      </div>
                      <div className="mt-3 text-[26px] font-semibold tracking-[-0.04em] text-white">
                        Ready to publish
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-8 grid gap-4 lg:grid-cols-3">
                {features.map((feature) => (
                  <article
                    key={feature.title}
                    className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 sm:p-7"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Offer
                    </div>
                    <h2 className="mt-4 text-[26px] font-semibold tracking-[-0.04em] text-white">
                      {feature.title}
                    </h2>
                    <p className="mt-4 text-[15px] leading-7 text-slate-300">
                      {feature.description}
                    </p>
                  </article>
                ))}
              </section>

              <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-7 sm:p-8 lg:p-10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Proof
                  </div>
                  <div className="mt-6 max-w-[18ch] text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[42px]">
                    Trusted by teams that want clarity, not content chaos.
                  </div>
                  <div className="mt-8 space-y-4">
                    {testimonials.map((item) => (
                      <blockquote
                        key={`${item.name}-${item.role}`}
                        className="rounded-[24px] border border-white/10 bg-black/20 p-6"
                      >
                        <p className="text-[18px] leading-8 tracking-[-0.02em] text-slate-100">
                          “{item.quote}”
                        </p>
                        <footer className="mt-5 text-[14px] text-slate-400">
                          <span className="font-medium text-white">{item.name}</span>
                          <span className="mx-2 text-slate-600">·</span>
                          <span>{item.role}</span>
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                </article>

                <aside className="rounded-[28px] border border-white/10 bg-white/[0.025] p-7 sm:p-8 lg:p-10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Website structure
                  </div>
                  <div className="mt-6 space-y-3">
                    {["Hero", "Offer", "Proof", "CTA", "Footer"].map((section) => (
                      <div
                        key={section}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                      >
                        <span className="text-[15px] font-medium text-white">{section}</span>
                        <span className="text-[12px] uppercase tracking-[0.14em] text-slate-500">
                          Section
                        </span>
                      </div>
                    ))}
                  </div>
                </aside>
              </section>

              <section className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(125,211,252,0.12),rgba(168,85,247,0.08),rgba(255,255,255,0.02))] px-7 py-8 sm:px-9 sm:py-10 lg:flex lg:items-end lg:justify-between lg:px-12 lg:py-12">
                <div className="max-w-[660px]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Final CTA
                  </div>
                  <h3 className="mt-4 text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[46px]">
                    Turn this preview into a live-ready website workflow.
                  </h3>
                  <p className="mt-5 text-[16px] leading-8 text-slate-200">
                    Review the structure, refine the message, and publish when the package feels right.
                  </p>
                </div>
                <div className="mt-7 lg:mt-0">
                  <button
                    type="button"
                    className="inline-flex min-h-[54px] items-center justify-center rounded-2xl bg-white px-6 text-[15px] font-semibold text-slate-950 transition hover:bg-slate-100"
                  >
                    Publish preview
                  </button>
                </div>
              </section>

              <footer className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.02] px-6 py-5 sm:px-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[18px] font-semibold tracking-[-0.03em] text-white">
                      {siteName}
                    </div>
                    <div className="mt-2 text-[14px] text-slate-400">
                      Website preview inside the Lumix workspace.
                    </div>
                  </div>
                  <nav className="flex flex-wrap gap-x-5 gap-y-3 text-[14px] text-slate-400">
                    {footerLinks.map((link) => (
                      <a key={link} href="#" className="transition hover:text-white">
                        {link}
                      </a>
                    ))}
                  </nav>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
