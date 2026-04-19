# Bulk Upload Troubleshooting Guide

## Common Issues and Solutions

### 1. "Sale Price is missing" error when data is present

**Symptoms:**

- File contains sale price data
- Column appears to be mapped correctly
- Still getting "Missing required mappings: Sale Price" error

**Debugging Steps:**

1. **Check Console Logs:**
   - Open browser developer tools (F12)
   - Look for "=== AUTO MAPPING DEBUG ===" logs
   - Check if your column header is being matched correctly

2. **Use Debug Button:**
   - Click the purple "Debug" button in the mapping step
   - Check console for detailed data analysis
   - Look for "=== DEBUG DATA ===" logs

3. **Common Column Header Issues:**
   - **Case sensitivity:** "Sale Price" vs "sale price" vs "SALE PRICE"
   - **Extra spaces:** "Sale Price " (with trailing space)
   - **Underscores:** "sale_price" vs "Sale Price"
   - **Different naming:** "Selling Price", "Final Price", "Current Price"

4. **Supported Sale Price Aliases:**
   - "selling price"
   - "offer price"
   - "discounted price"
   - "final price"
   - "sale price"
   - "sale_price"
   - "sell price"
   - "current price"
   - "actual price"

### 2. Column Mapping Not Working

**Check These:**

1. **Header Row:** Ensure your CSV/Excel has headers in the first row
2. **Data Format:** Make sure data is in proper format (numbers for prices, text for names)
3. **Empty Values:** Check if sample data has empty cells

### 3. File Upload Issues

**Supported Formats:**

- .xlsx (Excel)
- .xls (Excel legacy)
- .csv (Comma-separated values)

**File Size Limit:** 50MB maximum

### 4. Validation Debug Information

The enhanced debug features show:

- **Mapped:** Whether column is mapped to a product field
- **Has Data:** Whether sample row has actual data
- **Required:** Whether the field is required for validation

**Color Coding:**

- 🟢 Green checkmark: Mapped and has data
- 🟡 Yellow warning: Mapped but no data in sample
- 🔴 Red alert: Required field not mapped
- ⚫ Gray circle: Optional field, not mapped

### 5. Manual Mapping

If auto-mapping fails:

1. Click on any mapping item
2. Select the correct product field from the modal
3. Verify the sample data looks correct
4. Required fields are marked with "Required" badge

### 6. Data Validation

The system checks:

1. **Mapping Validation:** All required fields must be mapped
2. **Data Validation:** Mapped required fields must have actual data
3. **Sample Check:** Uses first row to validate data presence

## Getting Help

If issues persist:

1. Use the Debug button to get detailed logs
2. Check browser console for error messages
3. Verify your data format matches the template
4. Try with the sample CSV file: `frontend/test-data/sample-products.csv`
