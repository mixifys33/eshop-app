# White Screen Debug Guide

## Problem

The BulkUploadReview screen shows a white screen instead of content when navigating from BulkUpload.

## Debugging Steps

### Step 1: Test Basic Navigation

I've created a minimal test screen to verify navigation works:

**File**: `frontend/screens/BulkUploadReviewMinimal.js`

**Add to your navigation stack**:

```javascript
import BulkUploadReviewMinimal from "./screens/BulkUploadReviewMinimal";

<Stack.Screen
  name="BulkUploadReviewMinimal"
  component={BulkUploadReviewMinimal}
  options={{ headerShown: false }}
/>;
```

**Test**: Click "Proceed to Review" - should show a green success message.

### Step 2: Test Data Loading

If Step 1 works, try the simple version:

**File**: `frontend/screens/BulkUploadReviewSimple.js`

**Add to navigation**:

```javascript
import BulkUploadReviewSimple from "./screens/BulkUploadReviewSimple";

<Stack.Screen
  name="BulkUploadReviewSimple"
  component={BulkUploadReviewSimple}
  options={{ headerShown: false }}
/>;
```

**Update BulkUpload.js navigation**:

```javascript
navigation.navigate("BulkUploadReviewSimple");
```

### Step 3: Check Console Logs

Open browser dev tools and look for:

- `BulkUploadReviewMinimal: Rendering minimal version`
- `BulkUploadReviewSimple: Component mounted`
- Any error messages

### Step 4: Common Issues

#### Missing Navigation Registration

The most common cause is the screen not being registered in your navigation stack.

#### Missing Dependencies

Check if these components exist:

- `../components/Toast`
- `../hooks/useToast`

#### AsyncStorage Issues

The screen tries to load data from AsyncStorage. If this fails, it might cause a white screen.

#### Import Errors

Check if all imports are correct and components exist.

### Step 5: Error Checking

**Check for JavaScript errors**:

1. Open browser dev tools (F12)
2. Go to Console tab
3. Look for red error messages
4. Check Network tab for failed requests

**Common error patterns**:

- `Cannot resolve module '../components/Toast'`
- `Cannot resolve module '../hooks/useToast'`
- `AsyncStorage is not defined`
- Navigation errors

### Step 6: Progressive Testing

1. **Minimal** → Should show green success message
2. **Simple** → Should show data loading and file info
3. **Full** → Complete review interface

### Step 7: Manual Navigation Test

You can also test navigation manually in the console:

```javascript
// In browser console
navigation.navigate("BulkUploadReviewMinimal");
```

## Expected Results

### Minimal Version:

- ✅ Green "🎉 Navigation Works!" message
- ✅ "Test Button" that shows alert
- ✅ Back button works

### Simple Version:

- ✅ Shows "Loading..." initially
- ✅ Shows file info after loading
- ✅ Shows "Process Upload" button

### Full Version:

- ✅ Complete review interface
- ✅ File summary and mappings
- ✅ Processing functionality

## Next Steps

1. Add the minimal screen to navigation
2. Test basic navigation
3. Check console for errors
4. Progress to more complex versions
5. Report what you see in each step

This will help identify exactly where the issue is occurring!
