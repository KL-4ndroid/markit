# -*- coding: utf-8 -*-
import subprocess

repo = r"C:\Users\chean\Documents\Codex\2026-05-24\github-plugin-github-openai-curated\markit-master"

msg = ("feat(market-detail): read revenue/deals from dailyStats projection cache\n"
       "\n"
       "C2.19B: Add useMarketStatsFromProjection hook that reads totalRevenue\n"
       "and totalDeals from dailyStats (instead of market.totalRevenue and\n"
       "market.totalDeals) for the market detail page stats section.\n"
       "Fallback to market fields when projection is unavailable.\n"
       "\n"
       "Changes:\n"
       "- lib/db/hooks.ts: add useMarketStatsFromProjection()\n"
       "- app/markets/[id]/page.tsx: use stats.totalRevenue, stats.totalDeals\n"
       "  in the 'instant stats' section; use stats.totalInteractions for\n"
       "the interaction count condition")

cmds = [
    ["git", "-C", repo, "add", "-A"],
    ["git", "-C", repo, "commit", "-m", msg],
    ["git", "-C", repo, "push"],
]

for cmd in cmds:
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(f"CMD: {' '.join(cmd)}")
    print(f"STDOUT: {result.stdout}")
    print(f"STDERR: {result.stderr}")
    print(f"Return: {result.returncode}")
    if result.returncode != 0:
        print("FAILED")
        break
print("DONE")
