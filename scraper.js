const pptr = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
pptr.use(StealthPlugin());
const list = require("./genre-list");
const extra = require("./keyword-list");
var data = list.concat(extra);
const { writeFileSync } = require("fs");

const obj = {};
const errs = {};
const get = async () => {
  const browser = await pptr.launch({
    executablePath:
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  });
  const page = await browser.newPage();
  for (let i = 0; i < data.length; i++) {
    var m = data[i];
    var link = m.link.replace(/^title\/|\/$/g, "");
    if (obj[link]) continue;
    var info = { ...m, link };
    console.log(i, link);
    try {
      await page.goto(`https://www.imdb.com/title/${link}?ref_=ttls_li_tt`);
      await page.waitForSelector(".title_wrapper");
      const o = await page.evaluate(() => {
        var defaultEl = document.createElement("div");
        var h4s = (
          (document.getElementById("titleDetails") &&
            document.getElementById("titleDetails")) ||
          defaultEl
        ).querySelectorAll("h4");
        var countryEl, languageEl;
        for (let i = 0; i < h4s.length; i++) {
          let h4 = h4s[i];
          if (!countryEl && /country/i.test(h4.textContent.trim()))
            countryEl = h4.nextElementSibling;
          else if (!languageEl && /language/i.test(h4.textContent.trim()))
            languageEl = h4.nextElementSibling;
          if (countryEl && languageEl) break;
        }
        countryEl = countryEl || defaultEl;
        languageEl = languageEl || defaultEl;
        var bo = [...document.querySelectorAll("h3.subheading")].find((i) =>
          /^box office$/i.test(i.textContent.trim())
        );
        var bostats = [];
        if (bo) {
          while (
            bo.nextElementSibling &&
            bo.nextElementSibling.classList.contains("txt-block")
          ) {
            bostats.push(
              [...bo.nextElementSibling.childNodes]
                .map((i) =>
                  i.nodeType === 1 ? i.textContent.trim() : i.nodeValue.trim()
                )
                .filter((i) => !!i)
                .map((i) => i.replace(/\,|\:/g, ""))
            );
            bo = bo.nextElementSibling;
          }
        }
        return {
          rating: parseFloat(
            (document.querySelector('[itemprop="ratingValue"]') || defaultEl)
              .textContent || 0
          ),
          count: parseInt(
            (
              document.querySelector('[itemprop="ratingCount"]') ||
              document.createElement("div")
            ).textContent.replace(/\,/g, "") || 0
          ),
          country: countryEl.textContent,
          lang: languageEl.textContent,
          bo: bostats,
        };
      });

      if (!o) console.log(" has no rating");
      else info = { ...info, ...o };
      if (/^\d{4}$/.test(info.year)) info.decade = info.year.replace(/\d$/, 0);
      else console.log("year: " + info.year);
      obj[link] = info;
    } catch (e) {
      errs[link] = e.message;
      console.log("error: " + e.message);
    }
    writeFileSync("movie-data.json", JSON.stringify(obj, null, 2));
    await page.waitForTimeout(3000);
  }
  await browser.close();
};
get();
