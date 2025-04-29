const { Builder, By, Key, until } = require('selenium-webdriver')
const assert = require('assert')

describe('SearchNews', function() {
  this.timeout(30000)
  let driver
  let vars
  beforeEach(async function() {
    driver = await new Builder().forBrowser('chrome').build()
    vars = {}
  })
  afterEach(async function() {
    await driver.quit();
  })
  it('SearchNews', async function() {
    await driver.get("https://web.stage.vcc.hebronsoft.com/blog")
    await driver.manage().window().setRect({ width: 1440, height: 900 })
    
    // Wait for the page to load
    await driver.sleep(2000)
    
    // Find the search input using the correct selector
    const searchInput = await driver.findElement(By.css('input[placeholder="Search"]'))
    await searchInput.click()
    
    // Clear any existing text and enter the search term
    await searchInput.clear()
    const searchTerm = "test" // You can change this to any word you want to search for
    await searchInput.sendKeys(searchTerm)
    
    // Wait for search results to load
    await driver.sleep(2000)
    
    // Find all blog titles and their lastRefreshed dates
    const items = await driver.findElements(By.css('app-blog-list-item'))
    const itemData = []
    
    for (const item of items) {
        const title = await item.findElement(By.css('h4.font-semibold.text-24pxlh30px.font-Montserrat')).getText()
        // Get the lastRefreshed date from the API response
        const lastRefreshed = await driver.executeScript(`
            return fetch('https://api.stage.vcc.hebronsoft.com/web-api/article/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: {
                        limit: "10",
                        offset: "0",
                        order: "DESC",
                        orderBy: "lastRefreshed"
                    },
                    filter: {
                        search: "${searchTerm}",
                        tags: null,
                        categories: ["f22bfa2a-aeec-4dab-83f7-02f9ec5c014d","d5273f5f-39d1-42a4-b408-a1e334d52b66","e800a7a0-5864-4aff-aa48-7fef28debcc0"],
                        partners: []
                    }
                })
            })
            .then(response => response.json())
            .then(data => {
                const matchingArticle = data.data.find(article => article.title === "${title}");
                return matchingArticle ? matchingArticle.lastRefreshed : null;
            });
        `)
        if (lastRefreshed) {
            itemData.push({ title, lastRefreshed })
        }
    }
    
    // Log the results
    console.log('\nSearch results sorted by lastRefreshed (DESC):')
    itemData.forEach((item, index) => {
        console.log(`${index + 1}. Title: ${item.title}, lastRefreshed: ${item.lastRefreshed}`)
    })
    
    // Verify sorting
    for (let i = 0; i < itemData.length - 1; i++) {
        const currentDate = new Date(itemData[i].lastRefreshed)
        const nextDate = new Date(itemData[i + 1].lastRefreshed)
        assert.ok(currentDate >= nextDate, 
            `Items are not sorted correctly by lastRefreshed. ${itemData[i].title} (${itemData[i].lastRefreshed}) should come before ${itemData[i + 1].title} (${itemData[i + 1].lastRefreshed})`)
    }
    
    // Assert that we found at least one item
    assert.ok(itemData.length > 0, `No items found with "${searchTerm}" in title`)
  })
})
