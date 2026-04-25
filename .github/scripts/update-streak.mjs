import fs from "node:fs";
import path from "node:path";

const username = "parthpipermintwala";
const contributionsUrl = `https://github.com/users/${username}/contributions`;
const assetPath = path.resolve("assets/streak.svg");

function parseDate(dateText) {
  return new Date(`${dateText}T00:00:00Z`);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (startDate === endDate) {
    return formatShortDate(start);
  }

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  if (sameYear) {
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }

  return `${formatLongDate(start)} - ${formatLongDate(end)}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

async function fetchContributionsPage() {
  const response = await fetch(contributionsUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; GitHub Actions)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch contributions page: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

function extractContributionMap(html) {
  const contributionMap = new Map();

  const cellPattern =
    /<td\b[^>]*(?:data-date="([^"]+)"[^>]*id="([^"]+)"|id="([^"]+)"[^>]*data-date="([^"]+)")[^>]*>\s*<\/td>/g;
  for (const match of html.matchAll(cellPattern)) {
    const date = match[1] ?? match[4];
    const cellId = match[2] ?? match[3];
    const tooltipPattern = new RegExp(
      `<tool-tip\\b[^>]*for="${cellId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>([^<]+)<\\/tool-tip>`,
    );
    const tooltipMatch = html.match(tooltipPattern);
    const tooltipText = tooltipMatch ? tooltipMatch[1] : "";
    let count = 0;

    const countMatch = tooltipText.match(/^(\d+)\s+contributions?/i);
    if (countMatch) {
      count = Number(countMatch[1]);
    }

    contributionMap.set(date, count);
  }

  if (contributionMap.size === 0) {
    throw new Error(
      "Could not find contribution cells on the GitHub contributions page.",
    );
  }

  return contributionMap;
}

function computeRuns(contributionMap) {
  const dates = [...contributionMap.keys()].sort();
  const firstContribution = dates.find(
    (date) => (contributionMap.get(date) ?? 0) > 0,
  );
  if (!firstContribution) {
    return {
      totalContributions: 0,
      firstContribution: null,
      currentRun: null,
      longestRun: null,
    };
  }

  const latestDate = dates[dates.length - 1];
  let totalContributions = 0;
  let currentRun = null;
  let longestRun = null;
  let activeRun = null;

  for (
    let cursor = parseDate(firstContribution);
    cursor <= parseDate(latestDate);
    cursor = addDays(cursor, 1)
  ) {
    const dateKey = cursor.toISOString().slice(0, 10);
    const count = contributionMap.get(dateKey) ?? 0;
    totalContributions += count;

    if (count > 0) {
      if (!activeRun) {
        activeRun = {
          start: dateKey,
          end: dateKey,
          length: 1,
        };
      } else {
        activeRun.end = dateKey;
        activeRun.length += 1;
      }
      continue;
    }

    if (activeRun) {
      if (!longestRun || activeRun.length > longestRun.length) {
        longestRun = { ...activeRun };
      }

      currentRun = { ...activeRun };
      activeRun = null;
    }
  }

  if (activeRun) {
    if (!longestRun || activeRun.length > longestRun.length) {
      longestRun = { ...activeRun };
    }
    currentRun = { ...activeRun };
  }

  return {
    totalContributions,
    firstContribution,
    currentRun,
    longestRun,
  };
}

function renderSvg(stats) {
  const currentRun = stats.currentRun ?? {
    start: stats.firstContribution,
    end: stats.firstContribution,
    length: 0,
  };
  const longestRun = stats.longestRun ?? currentRun;

  const totalRange = `${formatShortDate(parseDate(stats.firstContribution))} - Present`;
  const currentRange = formatRange(currentRun.start, currentRun.end);
  const longestRange = formatRange(longestRun.start, longestRun.end);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="isolation: isolate" viewBox="0 0 495 195" width="495px" height="195px" direction="ltr">
  <style>
    @keyframes currstreak {
      0% { font-size: 3px; opacity: 0.2; }
      80% { font-size: 34px; opacity: 1; }
      100% { font-size: 28px; opacity: 1; }
    }
    @keyframes fadein {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
  </style>
  <defs>
    <clipPath id="outer_rectangle">
      <rect width="495" height="195" rx="4.5"/>
    </clipPath>
    <mask id="mask_out_ring_behind_fire">
      <rect width="495" height="195" fill="white"/>
      <ellipse id="mask-ellipse" cx="247.5" cy="32" rx="13" ry="18" fill="black"/>
    </mask>
  </defs>
  <g clip-path="url(#outer_rectangle)">
    <g style="isolation: isolate">
      <rect stroke="#000000" stroke-opacity="0" fill="#000000" fill-opacity="0" rx="4.5" x="0.5" y="0.5" width="494" height="194"/>
    </g>
    <g style="isolation: isolate">
      <line x1="165" y1="28" x2="165" y2="170" vector-effect="non-scaling-stroke" stroke-width="1" stroke="#1e2939" stroke-linejoin="miter" stroke-linecap="square" stroke-miterlimit="3"/>
      <line x1="330" y1="28" x2="330" y2="170" vector-effect="non-scaling-stroke" stroke-width="1" stroke="#1e2939" stroke-linejoin="miter" stroke-linecap="square" stroke-miterlimit="3"/>
    </g>
    <g style="isolation: isolate">
      <g transform="translate(82.5, 48)">
        <text x="0" y="32" stroke-width="0" text-anchor="middle" fill="#e2e8f0" stroke="none" font-family="Segoe UI, Ubuntu, sans-serif" font-weight="700" font-size="28px" font-style="normal" style="opacity: 0; animation: fadein 0.5s linear forwards 0.6s">${stats.totalContributions}</text>
      </g>
      <g transform="translate(82.5, 84)">
        <text x="0" y="32" stroke-width="0" text-anchor="middle" fill="#94a3b8" stroke="none" font-family="Segoe UI, Ubuntu, sans-serif" font-weight="400" font-size="14px" font-style="normal" style="opacity: 0; animation: fadein 0.5s linear forwards 0.7s">Total Contributions</text>
      </g>
      <g transform="translate(82.5, 114)">
        <text x="0" y="32" stroke-width="0" text-anchor="middle" fill="#64748b" stroke="none" font-family="Segoe UI, Ubuntu, sans-serif" font-weight="400" font-size="12px" font-style="normal" style="opacity: 0; animation: fadein 0.5s linear forwards 0.8s">${totalRange}</text>
      </g>
    </g>
    <g style="isolation: isolate">
      <g transform="translate(247.5, 108)">
        <text x="0" y="32" stroke-width="0" text-anchor="middle" fill="#4ea94b" stroke="none" font-family="Segoe UI, Ubuntu, sans-serif" font-weight="700" font-size="14px" font-style="normal" style="opacity: 0; animation: fadein 0.5s linear forwards 0.9s">Current Streak</text>
      </g>
      <g transform="translate(247.5, 145)">
        <text x="0" y="21" stroke-width="0" text-anchor="middle" fill="#64748b" stroke="none" font-family="Segoe UI, Ubuntu, sans-serif" font-weight="400" font-size="12px" font-style="normal" style="opacity: 0; animation: fadein 0.5s linear forwards 0.9s">${currentRange}</text>
      </g>
      <g mask="url(#mask_out_ring_behind_fire)">
        <circle cx="247.5" cy="71" r="40" fill="none" stroke="#4ea94b" stroke-width="5" style="opacity: 0; animation: fadein 0.5s linear forwards 0.4s"></circle>
      </g>
      <g transform="translate(247.5, 19.5)" stroke-opacity="0" style="opacity: 0; animation: fadein 0.5s linear forwards 0.6s">
        <path d="M -12 -0.5 L 15 -0.5 L 15 23.5 L -12 23.5 L -12 -0.5 Z" fill="none"/>
        <path d="M 1.5 0.67 C 1.5 0.67 2.24 3.32 2.24 5.47 C 2.24 7.53 0.89 9.2 -1.17 9.2 C -3.23 9.2 -4.79 7.53 -4.79 5.47 L -4.76 5.11 C -6.78 7.51 -8 10.62 -8 13.99 C -8 18.41 -4.42 22 0 22 C 4.42 22 8 18.41 8 13.99 C 8 8.6 5.41 3.79 1.5 0.67 Z M -0.29 19 C -2.07 19 -3.51 17.6 -3.51 15.86 C -3.51 14.24 -2.46 13.1 -0.7 12.74 C 1.07 12.38 2.9 11.53 3.92 10.16 C 4.31 11.45 4.51 12.81 4.51 14.2 C 4.51 16.85 2.36 19 -0.29 19 Z" fill="#38bdf8" stroke-opacity="0"/>
      </g>
      <g transform="translate(247.5, 48)">
        <text x="0" y="32" stroke-width="0" text-anchor="middle" fill="#0579C3" stroke="none" font-family="Segoe UI, Ubuntu, sans-serif" font-weight="700" font-size="28px" font-style="normal" style="animation: currstreak 0.6s linear forwards">${currentRun.length}</text>
      </g>
    </g>
    <g style="isolation: isolate">
      <g transform="translate(412.5, 48)">
        <text x="0" y="32" stroke-width="0" text-anchor="middle" fill="#e2e8f0" stroke="none" font-family="Segoe UI, Ubuntu, sans-serif" font-weight="700" font-size="28px" font-style="normal" style="opacity: 0; animation: fadein 0.5s linear forwards 1.2s">${longestRun.length}</text>
      </g>
      <g transform="translate(412.5, 84)">
        <text x="0" y="32" stroke-width="0" text-anchor="middle" fill="#94a3b8" stroke="none" font-family="Segoe UI, Ubuntu, sans-serif" font-weight="400" font-size="14px" font-style="normal" style="opacity: 0; animation: fadein 0.5s linear forwards 1.3s">Longest Streak</text>
      </g>
      <g transform="translate(412.5, 114)">
        <text x="0" y="32" stroke-width="0" text-anchor="middle" fill="#64748b" stroke="none" font-family="Segoe UI, Ubuntu, sans-serif" font-weight="400" font-size="12px" font-style="normal" style="opacity: 0; animation: fadein 0.5s linear forwards 1.4s">${longestRange}</text>
      </g>
    </g>
  </g>
</svg>
`;
}

async function main() {
  const html = await fetchContributionsPage();
  const contributionMap = extractContributionMap(html);
  const runs = computeRuns(contributionMap);

  if (!runs.firstContribution) {
    throw new Error("No contributions were found.");
  }

  const svg = renderSvg(runs);
  fs.writeFileSync(assetPath, svg);
  console.log(`Updated ${assetPath} from GitHub contributions data.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
