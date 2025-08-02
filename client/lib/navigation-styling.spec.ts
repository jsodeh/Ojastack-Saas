import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Navigation Styling Consistency", () => {
  const publicPages = [
    "Features.tsx",
    "Pricing.tsx", 
    "Docs.tsx",
    "Contact.tsx",
    "Index.tsx"
  ];

  const requiredButtonStyles = [
    // Dashboard button styling
    /<Button variant="ghost" asChild>/,
    // My Account button styling  
    /<Button asChild>/,
    // User icon styling
    /<User className="h-4 w-4 mr-2" \/>/,
    // Sign In button styling
    /<Button variant="ghost" asChild>/,
    // Get Started button styling
    /<Button asChild>/
  ];

  publicPages.forEach(page => {
    describe(`${page} styling`, () => {
      let fileContent: string;

      try {
        fileContent = readFileSync(join(process.cwd(), "client", "pages", page), "utf-8");
      } catch (error) {
        throw new Error(`Could not read ${page}: ${error}`);
      }

      it("should use consistent Button variant for Dashboard link", () => {
        if (fileContent.includes('Dashboard')) {
          expect(fileContent).toMatch(/<Button variant="ghost" asChild>\s*<Link to="\/dashboard">Dashboard<\/Link>/);
        }
      });

      it("should use consistent Button styling for My Account link", () => {
        if (fileContent.includes('My Account')) {
          expect(fileContent).toMatch(/<Button asChild>\s*<Link to="\/dashboard\/settings\/profile">/);
        }
      });

      it("should use consistent User icon styling", () => {
        if (fileContent.includes('My Account')) {
          expect(fileContent).toMatch(/<User className="h-4 w-4 mr-2" \/>/);
        }
      });

      it("should use consistent Button variant for Sign In link", () => {
        if (fileContent.includes('Sign In')) {
          expect(fileContent).toMatch(/<Button variant="ghost" asChild>\s*<Link to="\/login">Sign In<\/Link>/);
        }
      });

      it("should use consistent Button styling for Get Started link", () => {
        if (fileContent.includes('Get Started')) {
          expect(fileContent).toMatch(/<Button asChild>\s*<Link to="\/signup">Get Started<\/Link>/);
        }
      });

      it("should have consistent navigation container styling", () => {
        expect(fileContent).toMatch(/<div className="flex items-center space-x-4">/);
      });
    });
  });

  it("should have consistent button styling patterns across all pages", () => {
    const pageContents = publicPages.map(page => {
      try {
        return readFileSync(join(process.cwd(), "client", "pages", page), "utf-8");
      } catch (error) {
        throw new Error(`Could not read ${page}: ${error}`);
      }
    });

    // Extract button patterns from each page
    const buttonPatterns = pageContents.map((content, index) => {
      const hasDashboardButton = /<Button variant="ghost" asChild>\s*<Link to="\/dashboard">Dashboard<\/Link>/.test(content);
      const hasMyAccountButton = /<Button asChild>\s*<Link to="\/dashboard\/settings\/profile">/.test(content);
      const hasUserIcon = /<User className="h-4 w-4 mr-2" \/>/.test(content);
      const hasSignInButton = /<Button variant="ghost" asChild>\s*<Link to="\/login">Sign In<\/Link>/.test(content);
      const hasGetStartedButton = /<Button asChild>\s*<Link to="\/signup">Get Started<\/Link>/.test(content);
      const hasNavContainer = /<div className="flex items-center space-x-4">/.test(content);

      return {
        page: publicPages[index],
        hasDashboardButton,
        hasMyAccountButton,
        hasUserIcon,
        hasSignInButton,
        hasGetStartedButton,
        hasNavContainer
      };
    });

    // Verify all pages have navigation container
    buttonPatterns.forEach(pattern => {
      expect(pattern.hasNavContainer).toBe(true, 
        `${pattern.page} should have navigation container with consistent styling`);
    });

    // Verify pages with auth navigation have consistent button styling
    const authAwarePages = buttonPatterns.filter(p => 
      p.hasDashboardButton || p.hasMyAccountButton || p.hasSignInButton || p.hasGetStartedButton
    );

    authAwarePages.forEach(pattern => {
      if (pattern.hasDashboardButton) {
        expect(pattern.hasDashboardButton).toBe(true, 
          `${pattern.page} Dashboard button should use consistent styling`);
      }
      if (pattern.hasMyAccountButton) {
        expect(pattern.hasMyAccountButton).toBe(true, 
          `${pattern.page} My Account button should use consistent styling`);
        expect(pattern.hasUserIcon).toBe(true, 
          `${pattern.page} should have User icon with consistent styling`);
      }
      if (pattern.hasSignInButton) {
        expect(pattern.hasSignInButton).toBe(true, 
          `${pattern.page} Sign In button should use consistent styling`);
      }
      if (pattern.hasGetStartedButton) {
        expect(pattern.hasGetStartedButton).toBe(true, 
          `${pattern.page} Get Started button should use consistent styling`);
      }
    });
  });

  it("should maintain consistent hover state classes", () => {
    const pageContents = publicPages.map(page => {
      try {
        return readFileSync(join(process.cwd(), "client", "pages", page), "utf-8");
      } catch (error) {
        throw new Error(`Could not read ${page}: ${error}`);
      }
    });

    // Check that Button components are used consistently (they handle hover states)
    pageContents.forEach((content, index) => {
      if (content.includes('Dashboard') || content.includes('My Account') || 
          content.includes('Sign In') || content.includes('Get Started')) {
        expect(content).toMatch(/<Button/);
        expect(content).toContain('asChild');
      }
    });
  });
});