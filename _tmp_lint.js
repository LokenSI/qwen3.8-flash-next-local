const fs = require('fs');
const h = fs.readFileSync('d:/git/aitest/gravitational-nbody-lab.html', 'utf8');

const ids = [...h.matchAll(/id="([A-Za-z0-9_]+)"/g)].map(x => x[1]);
console.log('ids in html:', ids.length);
const refs = [...h.matchAll(/id\('([A-Za-z0-9_]+)'\)/g)].map(x => x[1]);
const missing = refs.filter(r => ids.indexOf(r) < 0);
console.log('js id refs:', refs.length, '| missing in html:', missing.length ? missing.join(',') : 'none');
const dups = ids.filter((v, i) => ids.indexOf(v) !== i);
console.log('duplicate ids:', dups.length ? dups.join(',') : 'none');

['@@NEXT@@', '@@P2@@', 'TODO', 'FIXME', 'implement physics', 'placeholder', 'undefined;'].forEach(t => {
  console.log('marker', JSON.stringify(t), ':', h.includes(t));
});
const cnt = (re) => (h.match(re) || []).length;
console.log('script open/close:', cnt(/<script>/g), cnt(/<\/script>/g));
console.log('style  open/close:', cnt(/<style>/g), cnt(/<\/style>/g));
console.log('div    open/close:', cnt(/<div\b/g), cnt(/<\/div>/g));
console.log('section open/close:', cnt(/<section\b/g), cnt(/<\/section>/g));
console.log('label  open/close:', cnt(/<label\b/g), cnt(/<\/label>/g));
console.log('bytes:', h.length, 'lines:', h.split('\n').length, 'crlf:', h.includes('\r\n'));
console.log('has doctype:', /^<!DOCTYPE html>/i.test(h.trim()), '| ends with </html>:', h.trim().endsWith('</html>'));
console.log('charset:', /<meta charset="utf-8">/i.test(h), '| viewport:', /name="viewport"/.test(h));
console.log('external urls:', [...new Set([...h.matchAll(/https?:\/\/[^"'\s)]+/g)].map(x => x[0]))].join(' | ') || 'none');
console.log('css :has usage:', h.includes(':has('));
console.log('devicePixelRatio:', h.includes('devicePixelRatio'));
