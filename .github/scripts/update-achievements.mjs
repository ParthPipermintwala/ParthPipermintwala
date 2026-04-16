import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const username = "ParthPipermintwala";
const achievementsUrl = `https://github.com/${username}?tab=achievements`;
const readmePath = path.resolve("README.md");

async function fetchAchievementsPage() {
  const response = await fetch(achievementsUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; GitHub Actions; +https://github.com/features/actions)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch achievements page: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

function extractAchievements(html) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const achievements = [];

  $('img[alt^="Achievement: "]').each((_, element) => {
    const image = $(element);
    const alt = image.attr("alt") || "";
    const name = alt.replace(/^Achievement:\s*/i, "").trim();
    const src = image.attr("src");

    if (!name || !src || seen.has(name)) {
      return;
    }

    seen.add(name);
    achievements.push({ name, src });
  });

  return achievements;
}

function renderAchievementCard({ name, src }) {
  return `
<img src="./assets/${name.toLowerCase().replace(/\s+/g, "-")}.png" width="100" />`;
}

function renderSection(achievements) {
  const cards = achievements.length
    ? achievements
        .map(renderAchievementCard)
        .map((card) => `${card.trim()}`)
        .join("\n")
    : `
    <div style="display:inline-block;vertical-align:top;width:calc(100% - 12px);min-width:280px;margin:6px;background:linear-gradient(135deg,rgba(11,18,32,0.96) 0%,rgba(17,24,39,0.94) 100%);border:1px solid #243041;border-radius:18px;padding:18px;box-shadow:0 18px 36px rgba(0,0,0,0.18);text-align:center;">
      <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.7;">No achievements were found on the live page right now.</p>
    </div>`;

  return `<!-- achievements:start -->

## 🏆 Achievements

<div>
${cards}
</div>

<!-- achievements:end -->`;
}

async function main() {
  const readme = fs.readFileSync(readmePath, "utf8");
  let achievements = [];

  try {
    const html = await fetchAchievementsPage();
    achievements = extractAchievements(html);
  } catch (error) {
    console.warn(`Skipping achievements refresh: ${error.message}`);
    return;
  }

  const replacement = renderSection(achievements);
  const updated = readme.replace(
    /<!-- achievements:start -->[\s\S]*?<!-- achievements:end -->/m,
    replacement,
  );

  if (updated === readme) {
    console.warn(
      "Could not find achievements markers in README.md; skipping update.",
    );
    return;
  }

  fs.writeFileSync(readmePath, updated);
  console.log(`Updated README.md with ${achievements.length} achievements.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
