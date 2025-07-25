# Troubleshooting

Common issues and solutions to help you get back to work quickly.

## Getting Started Issues

### Can't Create a Base

**Problem:** "Create Base" button is not working or shows an error.

**Solutions:**
1. **Check Internet Connection**: Ensure you have a stable internet connection
2. **Google Account Access**: Verify you're signed in to Google and have granted necessary permissions
3. **Browser Issues**: Try refreshing the page or using a different browser
4. **Account Limits**: Check if you've reached your base limit (upgrade if needed)

**Still not working?** Try signing out and back in, or contact support.

### Google Sheets Integration Problems

**Problem:** Base created but Google Sheets document not accessible.

**Solutions:**
1. **Permission Check**: Ensure the app has access to your Google Drive
2. **Google Account**: Verify you're using the same Google account for both services
3. **Sharing Settings**: Check if the Google Sheets document was created with correct permissions
4. **Manual Sync**: Try the "Sync Now" button in base settings

### Login Issues

**Problem:** Can't sign in or getting authentication errors.

**Solutions:**
1. **Clear Browser Cache**: Clear cookies and cache for the site
2. **Disable Extensions**: Temporarily disable browser extensions
3. **Incognito Mode**: Try signing in using an incognito/private window
4. **Google Account**: Ensure your Google account is active and accessible

## Data Synchronization Issues

### Changes Not Appearing in Google Sheets

**Problem:** Edits in the app don't show up in the connected Google Sheets.

**Solutions:**
1. **Wait for Sync**: Changes may take up to 30 seconds to sync
2. **Check Connection**: Verify your internet connection is stable
3. **Manual Sync**: Use "Sync Now" in base settings
4. **Refresh Google Sheets**: Reload the Google Sheets document
5. **Check Permissions**: Ensure the app still has write access to the document

### Changes Not Appearing in the App

**Problem:** Edits made directly in Google Sheets don't show in the app.

**Solutions:**
1. **Refresh the App**: Reload the page or use pull-to-refresh on mobile
2. **Check Sync Status**: Look for sync indicators in the interface
3. **Manual Sync**: Force a sync from base settings
4. **Data Format**: Ensure Google Sheets data follows the expected format
5. **Column Headers**: Verify column headers match field names

### Sync Conflicts

**Problem:** Getting "sync conflict" errors when multiple people edit simultaneously.

**Solutions:**
1. **Refresh Data**: Reload to get the latest version
2. **Manual Resolution**: Choose which version to keep when prompted
3. **Coordinate Edits**: Have team members work on different sections
4. **Use Comments**: Communicate about who's editing what

## Performance Issues

### Slow Loading

**Problem:** App or specific bases load slowly.

**Solutions:**
1. **Check Internet Speed**: Test your connection speed
2. **Reduce Data**: Use filters to limit displayed records
3. **Close Other Tabs**: Free up browser memory
4. **Clear Cache**: Clear browser cache and cookies
5. **Update Browser**: Ensure you're using a supported, up-to-date browser

### Large Table Performance

**Problem:** Tables with many records (>1000) are slow to load or edit.

**Solutions:**
1. **Use Views**: Create filtered views to show fewer records
2. **Hide Fields**: Hide unused fields to reduce data transfer
3. **Pagination**: Use the built-in pagination instead of loading all records
4. **Archive Data**: Move old records to separate tables
5. **Optimize Formulas**: Simplify complex formula fields

### Mobile Performance

**Problem:** App is slow or unresponsive on mobile devices.

**Solutions:**
1. **Close Apps**: Close other apps to free up memory
2. **Restart Browser**: Close and reopen your mobile browser
3. **Update App**: Ensure you're using the latest version
4. **Reduce Complexity**: Use simpler views on mobile
5. **Check Storage**: Ensure your device has sufficient storage space

## Field and Data Issues

### Formula Fields Not Calculating

**Problem:** Formula fields show errors or don't update.

**Solutions:**
1. **Check Syntax**: Verify formula syntax is correct
2. **Field References**: Ensure referenced fields exist and are named correctly
3. **Data Types**: Check that field types are compatible with the formula
4. **Circular References**: Avoid formulas that reference themselves
5. **Refresh**: Try editing and saving the formula again

### Attachment Upload Failures

**Problem:** Can't upload files to attachment fields.

**Solutions:**
1. **File Size**: Check if file exceeds size limits (usually 10MB)
2. **File Type**: Ensure file type is supported
3. **Internet Connection**: Verify stable connection for uploads
4. **Browser Permissions**: Allow file access in browser settings
5. **Storage Space**: Check if you have available storage quota

### Link Fields Not Working

**Problem:** Can't link records between tables.

**Solutions:**
1. **Table Access**: Ensure you have access to both tables
2. **Field Configuration**: Check link field settings and target table
3. **Record Existence**: Verify the records you're trying to link exist
4. **Permissions**: Ensure you have edit permissions on both tables
5. **Refresh**: Try refreshing the page and attempting again

## View and Display Issues

### Views Not Loading

**Problem:** Specific views won't load or show errors.

**Solutions:**
1. **Switch Views**: Try switching to a different view first
2. **Clear Filters**: Remove complex filters that might be causing issues
3. **Simplify View**: Reduce the number of fields or records displayed
4. **Browser Refresh**: Reload the page
5. **View Settings**: Check if view configuration is valid

### Missing Records

**Problem:** Records that should be visible are not showing.

**Solutions:**
1. **Check Filters**: Review active filters that might be hiding records
2. **View Settings**: Verify view configuration includes the records
3. **Permissions**: Ensure you have access to view the records
4. **Sync Status**: Check if data is fully synchronized
5. **Search**: Use search to locate specific records

### Formatting Issues

**Problem:** Data appears incorrectly formatted or styled.

**Solutions:**
1. **Field Types**: Verify field types match the data format
2. **Browser Zoom**: Check if browser zoom is affecting display
3. **Screen Size**: Ensure adequate screen size for the interface
4. **Browser Compatibility**: Use a supported browser version
5. **Clear Cache**: Clear browser cache and reload

## Collaboration Issues

### Can't Share Base

**Problem:** Sharing invitations aren't working or people can't access shared bases.

**Solutions:**
1. **Email Addresses**: Verify email addresses are correct
2. **Google Accounts**: Ensure invitees have Google accounts
3. **Spam Folders**: Ask invitees to check spam/junk folders
4. **Permissions**: Check that sharing permissions are set correctly
5. **Resend Invites**: Try resending invitations

### Comments Not Appearing

**Problem:** Comments aren't visible or notifications aren't working.

**Solutions:**
1. **Refresh Page**: Reload to see latest comments
2. **Permissions**: Ensure you have comment viewing permissions
3. **Notification Settings**: Check your notification preferences
4. **Browser Settings**: Allow notifications in browser settings
5. **Email Notifications**: Check email for comment notifications

### Real-time Updates Not Working

**Problem:** Changes by other users aren't appearing in real-time.

**Solutions:**
1. **WebSocket Connection**: Check if your network blocks WebSocket connections
2. **Firewall Settings**: Ensure firewall allows the application
3. **Browser Support**: Verify your browser supports real-time features
4. **Manual Refresh**: Use refresh button to get latest changes
5. **Network Issues**: Check for network connectivity problems

## Import and Export Issues

### Import Failures

**Problem:** Can't import CSV or Excel files.

**Solutions:**
1. **File Format**: Ensure file is in supported format (CSV, XLSX)
2. **File Size**: Check if file exceeds size limits
3. **Data Quality**: Remove special characters or formatting that might cause issues
4. **Column Headers**: Ensure first row contains column headers
5. **Encoding**: Save CSV files with UTF-8 encoding

### Export Problems

**Problem:** Export downloads are failing or incomplete.

**Solutions:**
1. **Browser Settings**: Check if downloads are blocked
2. **File Size**: Large exports might timeout - try filtering data first
3. **Popup Blockers**: Disable popup blockers for the site
4. **Network Stability**: Ensure stable connection during export
5. **Try Different Format**: Switch between CSV, Excel, or JSON formats

## Mobile-Specific Issues

### Touch Gestures Not Working

**Problem:** Swipe, pinch, or other touch gestures aren't responding.

**Solutions:**
1. **Browser Support**: Use a mobile browser that supports touch events
2. **Screen Sensitivity**: Check device touch screen settings
3. **Zoom Level**: Reset browser zoom to default
4. **Refresh Page**: Reload the page
5. **Alternative Actions**: Use button controls instead of gestures

### Mobile Layout Issues

**Problem:** Interface doesn't display correctly on mobile.

**Solutions:**
1. **Screen Orientation**: Try rotating device between portrait/landscape
2. **Browser Zoom**: Reset zoom level to 100%
3. **Full Screen**: Use full-screen mode if available
4. **Different Browser**: Try a different mobile browser
5. **Update Browser**: Ensure browser is up to date

## Browser-Specific Issues

### Chrome Issues
- Clear site data: Settings > Privacy > Site Settings > View permissions and data stored across sites
- Disable extensions temporarily
- Try incognito mode

### Safari Issues
- Enable JavaScript: Preferences > Security > Enable JavaScript
- Clear website data: Develop > Empty Caches
- Check Intelligent Tracking Prevention settings

### Firefox Issues
- Clear cookies and site data for the domain
- Check if Enhanced Tracking Protection is interfering
- Disable strict content blocking temporarily

### Edge Issues
- Reset browser settings if needed
- Check if tracking prevention is too strict
- Clear browsing data

## Getting Additional Help

### Before Contacting Support

1. **Try Basic Solutions**: Refresh page, clear cache, try different browser
2. **Check Status Page**: Visit our status page for known issues
3. **Search Documentation**: Look through this guide and FAQ
4. **Community Forum**: Check if others have reported similar issues

### When Contacting Support

Include this information:
- **Browser and Version**: Chrome 91, Safari 14, etc.
- **Operating System**: Windows 10, macOS Big Sur, etc.
- **Error Messages**: Exact text of any error messages
- **Steps to Reproduce**: What you were doing when the issue occurred
- **Screenshots**: Visual evidence of the problem
- **Base/Table IDs**: If the issue is specific to certain data

### Emergency Data Recovery

If you've lost important data:
1. **Don't Panic**: Data is backed up in Google Sheets
2. **Check Google Sheets**: Access the connected Google Sheets document
3. **Version History**: Use Google Sheets version history to recover previous versions
4. **Contact Support**: Reach out immediately for assistance
5. **Export Backup**: Export current data as a precaution

### Performance Optimization Tips

For the best experience:
- **Use Supported Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Stable Internet**: Ensure reliable internet connection
- **Regular Maintenance**: Clear cache and cookies periodically
- **Update Software**: Keep browser and OS updated
- **Monitor Usage**: Be aware of data and storage limits

Remember: Most issues can be resolved with simple solutions like refreshing the page or clearing your browser cache. Don't hesitate to reach out for help if problems persist!