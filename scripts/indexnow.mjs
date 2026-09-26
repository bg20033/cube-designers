// Notifies IndexNow engines (Bing, which also powers ChatGPT Search and
// Copilot, plus Yandex, Seznam, Naver) about every URL in the live sitemap.
// Run after a production deploy: npm run seo:indexnow
const SITE = "https://www.cube-designers.com"
const KEY = "f6d2526ee1c6d20ca2401d80b3d2ac22"

const sitemap = await fetch(`${SITE}/sitemap.xml`).then((response) => {
  if (!response.ok) throw new Error(`Sitemap returned ${response.status}`)
  return response.text()
})
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
if (!urlList.length) throw new Error("No URLs found in the sitemap")

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(SITE).host,
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList,
  }),
})

// 200 = accepted, 202 = accepted pending key check.
console.log(`IndexNow: ${response.status} for ${urlList.length} URLs`)
if (response.status >= 400) {
  console.error(await response.text())
  process.exit(1)
}
