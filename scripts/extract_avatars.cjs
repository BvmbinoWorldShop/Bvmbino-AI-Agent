const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const outDir = path.join(__dirname, '..', 'public', 'assets', 'avatars');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let html = fs.readFileSync(htmlPath, 'utf8');
console.log('Original index.html size:', html.length);

// 1. Extract apple-touch-icon
const appleMatch = html.match(/<link\s+rel="apple-touch-icon"\s+href="(data:image\/(png|jpeg);base64,([^"]+))"/);
if (appleMatch) {
  const ext = appleMatch[2] === 'jpeg' ? 'jpg' : 'png';
  const filePath = path.join(outDir, `apple-touch-icon.${ext}`);
  fs.writeFileSync(filePath, Buffer.from(appleMatch[3], 'base64'));
  console.log(`Saved apple-touch-icon.${ext} (${fs.statSync(filePath).size} bytes)`);
  html = html.replace(appleMatch[1], `/assets/avatars/apple-touch-icon.${ext}`);
}

// 2. Extract Billy portrait
const billyMatch = html.match(/billyImg\s*=\s*`<img\s+src="(data:image\/(png|jpeg);base64,([^"]+))"/);
if (billyMatch) {
  const ext = billyMatch[2] === 'jpeg' ? 'jpg' : 'png';
  const filePath = path.join(outDir, `billy.${ext}`);
  fs.writeFileSync(filePath, Buffer.from(billyMatch[3], 'base64'));
  console.log(`Saved billy.${ext} (${fs.statSync(filePath).size} bytes)`);
  html = html.replace(billyMatch[1], `/assets/avatars/billy.${ext}`);
}

// 3. Extract Specialist portraits from GRID_SKILLS
const startIdx = html.indexOf('const GRID_SKILLS = [');
const endIdx = html.indexOf('];', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  let skillsBlock = html.slice(startIdx, endIdx + 2);
  const regex = /{\s*id:\s*'([^']+)',[\s\S]*?icon:\s*'(data:image\/([a-zA-Z+]+);base64,([^']+))'/g;

  let m;
  const replacements = [];
  while ((m = regex.exec(skillsBlock)) !== null) {
    const id = m[1];
    const dataUri = m[2];
    const mime = m[3];
    const base64Data = m[4];
    const ext = mime.includes('jpeg') ? 'jpg' : 'png';
    const filename = `${id}.${ext}`;
    const filePath = path.join(outDir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    console.log(`Saved ${filename} (${fs.statSync(filePath).size} bytes)`);
    replacements.push({ from: dataUri, to: `/assets/avatars/${filename}` });
  }

  for (const r of replacements) {
    html = html.replaceAll(r.from, r.to);
  }
}

console.log('New index.html size:', html.length);
fs.writeFileSync(htmlPath, html, 'utf8');

// Also update root index.html to match
const rootHtmlPath = path.join(__dirname, '..', 'index.html');
fs.writeFileSync(rootHtmlPath, html, 'utf8');
console.log('Successfully updated public/index.html and root index.html!');
