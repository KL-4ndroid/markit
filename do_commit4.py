# -*- coding: utf-8 -*-
import subprocess

repo = r"C:\Users\chean\Documents\Codex\2026-05-24\github-plugin-github-openai-curated\markit-master"

msg = ("feat(market-list): read revenue/deals from dailyStats projection via batch hook\n"
       "\n"
       "C3.5: Add useMarketStatsBatch() hook that queries dailyStats once\n"
       "for all markets and returns a map, replacing per-market queries.\n"
       "Pass optional stats prop to MarketCard so cards display projection\n"
       "revenue/deals instead of market.totalRevenue/totalDeals.\n"
       "\n"
       "Changes:\n"
       "- lib/db/hooks.ts: add useMarketStatsBatch()\n"
       "- components/markets/MarketCard.tsx: accept optional stats prop,\n"
       "  use projection revenue/deals when available\n"
       "- app/markets/page.tsx: use useMarketStatsBatch, pass stats to cards")

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
