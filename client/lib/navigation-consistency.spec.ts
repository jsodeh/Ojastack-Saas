import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Navigation Consistency", () => {
  const publicPages = [
    "Features.tsx",
    "Pricing.tsx", 
    "Docs.tsx",
    "Contact.tsx"
  ];

  const requiredImports = [
    'import { useAuth } from "@/lib/auth-context"',
    'User'
  ];

  const requiredPatterns = [
    /const \{ user \} = useAuth\(\)/,
    /\{user \? \(/,
    /<Link to="\/dashboard">Dashboard<\/Link>/,
    /<Link to="\/dashboard\/settings\/profile">/,
    /<User className="h-4 w-4 mr-2" \/>/,
    /My Account/,
    /<Link to="\/login">Sign In<\/Link>/,
    /<Link to="\/signup">Get Started<\/Link>/
  ];

  publicPages.forEach(page => {
    describe(`${page} navigation`, () => {
      let fileContent: string;

      try {
        fileContent = readFileSync(join(process.cwd(), "client", "pages", page), "utf-8");
      } catch (error) {
        throw new Error(`Could not read ${page}: ${error}`);
      }

      it("should import useAuth hook", () => {
        expect(fileContent).toContain('import { useAuth } from "@/lib/auth-context"');
      });

      it("should import User icon", () => {
        expect(fileContent).toContain("User");
      });

      it("should use useAuth hook in component", () => {
        expect(fileContent).toMatch(/const \{ user \} = useAuth\(\)/);
      });

      it("should have conditional navigation rendering", () => {
        expect(fileContent).toMatch(/\{user \? \(/);
      });

      it("should have Dashboard link for authenticated users", () => {
        expect(fileContent).toMatch(/<Link to="\/dashboard">Dashboard<\/Link>/);
      });

      it("should have My Account link for authenticated users", () => {
        expect(fileContent).toMatch(/<Link to="\/dashboard\/settings\/profile">/);
        expect(fileContent).toContain("My Account");
      });

      it("should have User icon in My Account button", () => {
        expect(fileContent).toMatch(/<User className="h-4 w-4 mr-2" \/>/);
      });

      it("should have Sign In link for unauthenticated users", () => {
        expect(fileContent).toMatch(/<Link to="\/login">Sign In<\/Link>/);
      });

      it("should have Get Started link for unauthenticated users", () => {
        expect(fileContent).toMatch(/<Link to="\/signup">Get Started<\/Link>/);
      });

      it("should use asChild prop for Button components", () => {
        expect(fileContent).toContain('asChild');
      });
    });
  });

  it("should have consistent navigation structure across all pages", () => {
    const pageContents = publicPages.map(page => {
      try {
        return readFileSync(join(process.cwd(), "client", "pages", page), "utf-8");
      } catch (error) {
        throw new Error(`Could not read ${page}: ${error}`);
      }
    });

    // Check that all pages have the same navigation pattern
    const navigationPatterns = pageContents.map(content => {
      const hasUseAuth = /const \{ user \} = useAuth\(\)/.test(content);
      const hasConditionalNav = /\{user \? \(/.test(content);
      const hasDashboardLink = /<Link to="\/dashboard">Dashboard<\/Link>/.test(content);
      const hasMyAccountLink = /<Link to="\/dashboard\/settings\/profile">/.test(content);
      const hasSignInLink = /<Link to="\/login">Sign In<\/Link>/.test(content);
      const hasGetStartedLink = /<Link to="\/signup">Get Started<\/Link>/.test(content);

      return {
        hasUseAuth,
        hasConditionalNav,
        hasDashboardLink,
        hasMyAccountLink,
        hasSignInLink,
        hasGetStartedLink
      };
    });

    // All pages should have the same navigation pattern
    const firstPattern = navigationPatterns[0];
    navigationPatterns.forEach((pattern, index) => {
      expect(pattern).toEqual(firstPattern, 
        `Navigation pattern mismatch in ${publicPages[index]}`);
    });
  });
});