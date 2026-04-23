import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-static";

function getLegacyBodyHtml() {
  const html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "";
  return body.replace(/<script[\s\S]*?<\/script>/gi, "").trim();
}

export default function HomePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: getLegacyBodyHtml() }} />
      <script type="module" src="/app.js" async />
    </>
  );
}
