const JSZip = require('jszip');
const fs = require('fs');

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function generate() {
    const zip = new JSZip();
    const uuid = 'urn:uuid:12345678-1234-4abc-8def-1234567890ab';

    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n    <rootfiles>\n        <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>\n    </rootfiles>\n</container>`;
    zip.folder('META-INF').file('container.xml', containerXml);

    const textFolder = zip.folder('Text');

    const chapters = [
        { title: '第一章 起始', content: '这是第一章的内容。\n这是第二行。' },
        { title: '第二章 延续', content: '这是第二章的内容。' },
        { title: '第三章 延续', content: '这是第三章的内容。' },
        { title: '第四章 延续', content: '这是第四章的内容。' },
        { title: '第五章 延续', content: '这是第五章的内容。' }
    ];

    let manifestItems = '';
    let spineItems = '';
    let htmlNavLinks = '';
    let ncxNavPoints = '';

    chapters.forEach((chap, index) => {
        const id = `chap_${index + 1}`;
        const hrefPath = `Text/${id}.xhtml`;
        const safeTitle = escapeXml(chap.title);
        const safeContent = escapeXml(chap.content)
            .split('\n')
            .map(line => line.trim() ? `<p>${line.trim()}</p>` : '')
            .join('\n');

        const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">\n<head>\n    <meta charset="UTF-8" />\n    <title>${safeTitle}</title>\n</head>\n<body>\n    <h1>${safeTitle}</h1>\n    ${safeContent}\n</body>\n</html>`;

        textFolder.file(`${id}.xhtml`, htmlContent);

        manifestItems += `    <item id="${id}" href="${hrefPath}" media-type="application/xhtml+xml" />\n`;
        spineItems += `    <itemref idref="${id}" />\n`;
        htmlNavLinks += `        <li><a href="${hrefPath}">${safeTitle}</a></li>\n`;
        ncxNavPoints += `        <navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">\n            <navLabel><text>${safeTitle}</text></navLabel>\n            <content src="${hrefPath}" />\n        </navPoint>\n`;
    });

    const navHtmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN">\n<head>\n    <meta charset="UTF-8" />\n    <title>目录</title>\n</head>\n<body>\n    <nav epub:type="toc" id="toc">\n        <h1>目 录</h1>\n        <ol>\n${htmlNavLinks}        </ol>\n    </nav>\n</body>\n</html>`;
    zip.file('nav.xhtml', navHtmlContent);

    const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n    <head>\n        <meta name="dtb:uid" content="${uuid}" />\n        <meta name="dtb:depth" content="1" />\n        <meta name="dtb:totalPageCount" content="0" />\n        <meta name="dtb:maxPageNumber" content="0" />\n    </head>\n    <docTitle><text>${escapeXml('示例书')}</text></docTitle>\n    <navMap>\n${ncxNavPoints}    </navMap>\n</ncx>`;
    zip.file('toc.ncx', ncxContent);

    manifestItems = `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />\n    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />\n` + manifestItems;

    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">\n    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n        <dc:title>${escapeXml('示例书')}</dc:title>\n        <dc:creator id="aut">作者</dc:creator>\n        <dc:language>zh-CN</dc:language>\n        <dc:identifier id="bookid">${uuid}</dc:identifier>\n        <meta property="dcterms:modified">${new Date().toISOString().split('.')[0] + 'Z'}</meta>\n    </metadata>\n    <manifest>\n${manifestItems}    </manifest>\n    <spine toc="ncx">\n${spineItems}    </spine>\n</package>`;
    zip.file('content.opf', contentOpf);

    const nodeBuffer = await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
    fs.writeFileSync('sample.epub', nodeBuffer);
    console.log('生成 sample.epub');
}

generate().catch(err => { console.error(err); process.exit(1); });
