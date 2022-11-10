import { sleep } from "@hashintel/hash-shared/sleep";
import { test, expect } from "./shared/runtime";
import { loginUsingUi } from "./shared/login-using-ui";
import { resetDb } from "./shared/reset-db";

test.beforeEach(async () => {
  await resetDb();
});

/**
 * @todo: Re-enable this playwright test when required backend functionality is fixed
 * @see https://app.asana.com/0/1202805690238892/1203106234191599/f
 */
test.skip("user can create and update entity", async ({ page }) => {
  await loginUsingUi({ page, accountShortName: "bob" });

  // Check if we are on the user page
  await expect(page.locator("text=Welcome to HASH")).toBeVisible();

  // Go to Create Entity
  await page.locator('[data-testid="create-entity-btn"]').click();
  await page.waitForURL(
    (url) => !!url.pathname.match(/^\/[\w-]+\/types+\/new/),
  );

  // Create a random entity name for each test
  const entityName = `TestEntity${(Math.random() * 1000).toFixed()}`;

  // Fill up entity creation form
  await page.fill(
    '[data-testid=entity-type-creation-form] input[name="name"]',
    entityName,
  );
  await page.fill(
    '[data-testid=entity-type-creation-form] input[name="description"]',
    "Test Entity",
  );

  // Submit entity creation form and wait for page load
  await page.click("[data-testid=entity-type-creation-form] button");
  await page.waitForURL(
    (url) => !!url.pathname.match(/^\/[\w-]+(\/types\/)[\w-]+/),
  );

  // Create a new Property
  await page.click('[placeholder="newProperty"]');
  await page.fill('[placeholder="newProperty"]', "Property1");
  await page.click("text=Create Property");

  // Wait until property gets created
  await sleep(1000);

  // Click on New Entity button to create new instance of entity
  await page.click(`text=New ${entityName}`);
  await page.waitForURL(
    (url) => !!url.pathname.match(/^\/[\w-]+(\/entities\/new)/),
  );

  // Expect the created property to be present
  await expect(
    page.locator(`text=Property1Property1 >> input[type="text"]`),
  ).toBeVisible();

  // Go back and add another property to the entity
  await page.goBack();

  await page.click('[placeholder="newProperty"]');
  await page.fill('[placeholder="newProperty"]', "Property2");
  await page.click("text=Create Property");

  // Wait until property gets created
  await sleep(1000);

  // Click on New Entity button to create new instance of entity
  await page.click(`text=New ${entityName}`);
  await page.waitForURL(
    (url) => !!url.pathname.match(/^\/[\w-]+(\/entities\/new)/),
  );

  // Expect the newly created property to be present
  await expect(
    page.locator(`text=Property2Property2 >> input[type="text"]`),
  ).toBeVisible();
});
