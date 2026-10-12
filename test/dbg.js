const { _electron: electron } = require("playwright"); const path=require("path");
(async()=>{const app=await electron.launch({args:[path.join(__dirname,".."),"--no-sandbox"]});const page=await app.firstWindow();
await page.waitForTimeout(2500); const pw=page.locator('input[type="password"]'); console.log('pw count',await pw.count());
if(await pw.count()){await pw.fill("1234B");await page.keyboard.press("Enter");await page.waitForTimeout(1500);}
console.log('buttons:', await page.locator('button').evaluateAll(bs=>bs.map(b=>b.textContent.trim()).filter(Boolean).slice(0,40)));
console.log('continue count', await page.getByRole("button",{name:/Continue/}).count());
const b=page.locator('button:has-text("Continue")'); console.log('has-text count', await b.count());
await b.first().click({timeout:5000}).then(()=>console.log('clicked')).catch(e=>console.log('click err',e.message.split('\n')[0]));
await page.waitForTimeout(800); console.log('step text', await page.locator('text=/step \\d of 5/').first().textContent().catch(()=>'?'));
await app.close();})();
