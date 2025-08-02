# Talk to Sales Button Visibility Fix

## Introduction

The "Talk to Sales" button on the front page (Index.tsx) has a visibility issue where the button text is not visible until the user hovers over it. This creates a poor user experience as users cannot see the button text in its default state.

## Requirements

### Requirement 1: Button Text Visibility

**User Story:** As a visitor to the Ojastack website, I want to see the "Talk to Sales" button text clearly without having to hover over it, so that I can easily identify and click the button to contact sales.

#### Acceptance Criteria

1. WHEN a user loads the front page THEN the "Talk to Sales" button SHALL display with clearly visible white text
2. WHEN a user views the button in its default state THEN the text SHALL have sufficient contrast against the gradient background
3. WHEN a user hovers over the button THEN the text SHALL remain visible and change to the primary color as intended
4. WHEN the button is rendered THEN it SHALL maintain consistent styling with the existing design system

### Requirement 2: Cross-browser Compatibility

**User Story:** As a visitor using any modern browser, I want the "Talk to Sales" button to display correctly, so that I have a consistent experience regardless of my browser choice.

#### Acceptance Criteria

1. WHEN the page loads in Chrome, Firefox, Safari, or Edge THEN the button text SHALL be visible in all browsers
2. WHEN CSS specificity conflicts occur THEN the button text visibility SHALL take precedence
3. WHEN the button variant styles are applied THEN they SHALL NOT override the explicit text color

### Requirement 3: Maintain Design Consistency

**User Story:** As a designer/developer, I want the button fix to maintain the existing design system, so that the visual consistency of the site is preserved.

#### Acceptance Criteria

1. WHEN the button is fixed THEN it SHALL maintain the same size, padding, and border styling
2. WHEN the hover state is triggered THEN it SHALL continue to show the white background with primary text color
3. WHEN the button is displayed THEN it SHALL remain visually consistent with the "Start Building Free" button beside it