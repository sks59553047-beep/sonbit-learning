#!/usr/bin/env bash
# 손빛 배움터를 Cloudflare Pages(https://sonbit.pages.dev)에 올린다.
# 사용: (git 커밋을 먼저 한 뒤) bash deploy.sh
# - 화면 파일은 sonbit-dist, 서버 함수(오류 보고·의견 게시판)는 functions, 저장소 연결(D1)은 wrangler.toml 로 함께 올린다.
# - 비밀값(GITHUB_TOKEN, ADMIN_PASSWORD, BOARD_SALT)은 Cloudflare 에만 있고 이 파일·저장소에는 없다.
# - wrangler 에 --force 같은 강제 옵션은 쓰지 않는다.
set -euo pipefail
cd "$(dirname "$0")"
V=$(git rev-parse --short HEAD)
OUT="${TMPDIR:-/tmp}/sonbit-deploy"
rm -rf "$OUT"; mkdir -p "$OUT/sonbit-dist"
cp -r assets index.html admin.html manifest.webmanifest icon-192.png icon-512.png favicon.svg og-image.png videos robots.txt sitemap.xml googled60831f513937481.html "$OUT/sonbit-dist/"
cp -r functions wrangler.toml "$OUT/"
find "$OUT" -name desktop.ini -delete
# 올린 판이 어느 커밋인지 화면 머리에 적는다(오류 보고에 함께 실림)
sed -i "s/name=\"sonbit-version\" content=\"[^\"]*\"/name=\"sonbit-version\" content=\"$V\"/" "$OUT/sonbit-dist/index.html"
# 브라우저가 예전 파일을 그대로 쓰지 않게 화면 파일(js·css) 주소에 올린 때를 붙인다(2026-11-21: 미리보기에서 새 아이콘이 안 나옴 — 예전 app-core.js 를 씀)
STAMP="$V-$(date +%Y%m%d%H%M%S)"
sed -i -E "s#(src|href)=\"(assets/[^\"?]+\.(js|css))\"#\1=\"\2?v=$STAMP\"#g" "$OUT/sonbit-dist/index.html"
echo "파일 주소 표시: ?v=$STAMP ($(grep -c "?v=$STAMP" "$OUT/sonbit-dist/index.html")곳)"
cd "$OUT"
# BRANCH=preview bash deploy.sh 로 올리면 미리보기 주소(https://preview.sonbit.pages.dev)에만 올라가고 실제 주소는 그대로다
npx -y wrangler pages deploy sonbit-dist --project-name sonbit --branch "${BRANCH:-main}" --commit-dirty=true
echo "올린 판: $V"
