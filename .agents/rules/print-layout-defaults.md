# Rule: print-layout-defaults

## Motivation
Never rely on the user to manually configure the browser's print dialog (e.g. custom margins or scaling factor) when printing fixed-size layouts such as product labels.

## Guidelines
1. **Never rely on the user to adjust browser print settings** (like Scale or Custom Margins).
2. Use `@page` rules to set precise margins:
   ```css
   @page {
     margin: 0.33in 0.13in 0.46in 0.11in; /* top right bottom left */
   }
   ```
3. If scaling is required to fit content within those margins across different paper sizes, use CSS `transform: scale(...)` inside `@media print` rather than instructing the user to change the browser's print scale.
4. Ensure the container (e.g., `.print-label`) adapts cleanly to whatever paper size the user selects, allowing multiple labels to stack naturally with a standard small gap if the paper is larger than a single label.
