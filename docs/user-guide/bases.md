# Creating and Managing Bases

A base is your workspace that contains related tables, similar to a database. This guide covers everything you need to know about working with bases.

## What is a Base?

A base is a collection of related tables that work together. For example:
- **Project Management Base**: Tasks, Team Members, Projects tables
- **CRM Base**: Contacts, Companies, Deals tables  
- **Inventory Base**: Products, Suppliers, Orders tables

Each base is automatically connected to a Google Sheets document for data storage and backup.

## Creating a New Base

### From Dashboard
1. Click **"+ New Base"** on your dashboard
2. Enter a base name (required)
3. Add a description (optional but recommended)
4. Click **"Create Base"**

### From Template
1. Click **"Browse Templates"** on your dashboard
2. Select a template that matches your needs
3. Click **"Use This Template"**
4. Customize the name and description
5. Click **"Create Base"**

## Base Settings

Access base settings by clicking the gear icon next to your base name.

### General Settings
- **Base Name**: Change the display name
- **Description**: Update the base description
- **Icon**: Choose an icon to represent your base
- **Color**: Set a color theme for easy identification

### Google Sheets Integration
- **Sheets Document**: View the connected Google Sheets document
- **Sync Status**: Check synchronization status
- **Manual Sync**: Force a sync if needed
- **Backup Settings**: Configure automatic backups

## Sharing and Collaboration

### Sharing a Base

1. Click the **"Share"** button in the top-right corner
2. Choose sharing method:
   - **Invite by Email**: Send invitations to specific people
   - **Share Link**: Create a shareable link with permissions
   - **Make Public**: Allow anyone with the link to access

### Permission Levels

**Owner**
- Full control over base and all tables
- Can delete the base
- Can manage all sharing settings

**Editor**
- Can create, edit, and delete records
- Can modify table structure (add/remove fields)
- Can create and modify views
- Cannot delete the base or change sharing settings

**Commenter**
- Can view all data
- Can add comments to records
- Cannot edit data or structure

**Viewer**
- Can view all data
- Cannot edit, comment, or modify anything

### Managing Collaborators

1. Go to **Base Settings** > **Collaborators**
2. View all current collaborators and their permissions
3. Change permissions by clicking the dropdown next to a user's name
4. Remove access by clicking the "X" next to a user
5. Resend invitations for pending invites

## Base Organization

### Naming Conventions
- Use clear, descriptive names
- Include the purpose or department (e.g., "Marketing Campaigns 2024")
- Avoid special characters that might cause sync issues

### Structuring Your Base
- **Related Data**: Keep related tables in the same base
- **Separate Concerns**: Don't mix unrelated data (e.g., HR and Inventory)
- **Consider Scale**: Large bases with many tables may be slower

### Table Organization
- Order tables logically (main entities first, lookup tables last)
- Use consistent naming across tables
- Document relationships between tables in descriptions

## Base Templates

### Using Templates
Templates provide pre-built base structures for common use cases:

- **Project Management**: Tasks, milestones, team tracking
- **CRM**: Contact management, deal pipeline
- **Content Calendar**: Editorial planning and scheduling
- **Event Planning**: Venue, vendor, and attendee management
- **Inventory Management**: Product tracking and orders

### Creating Custom Templates
1. Set up your base with the desired structure
2. Add sample data to demonstrate usage
3. Go to **Base Settings** > **Save as Template**
4. Add template name, description, and category
5. Choose whether to make it public or private

## Importing and Exporting Bases

### Importing from Other Sources
- **Airtable**: Export from Airtable and import CSV files
- **Google Sheets**: Connect existing sheets or import data
- **Excel**: Import .xlsx files with multiple sheets
- **CSV Files**: Import individual tables

### Exporting Your Base
1. Go to **Base Settings** > **Export**
2. Choose export format:
   - **Full Base Export**: All tables and structure
   - **Individual Tables**: Select specific tables
   - **Data Only**: Records without structure
3. Select file format (CSV, Excel, JSON)
4. Click **"Export"**

## Base Maintenance

### Regular Tasks
- **Review Permissions**: Audit who has access quarterly
- **Clean Up Data**: Remove outdated or duplicate records
- **Update Structure**: Add new fields as needs evolve
- **Check Sync Status**: Ensure Google Sheets integration is working

### Performance Optimization
- **Archive Old Data**: Move historical data to separate bases
- **Optimize Views**: Remove unused views and complex filters
- **Monitor Record Count**: Large tables (>10,000 records) may need optimization
- **Review Formulas**: Complex formulas can slow down performance

### Backup and Recovery
- **Automatic Backups**: Enabled by default through Google Sheets
- **Manual Exports**: Export important bases monthly
- **Version History**: Access previous versions through Google Sheets
- **Recovery Process**: Contact support for data recovery assistance

## Troubleshooting Common Issues

### Sync Problems
**Issue**: Changes not appearing in Google Sheets
**Solution**: 
1. Check internet connection
2. Verify Google account permissions
3. Try manual sync from base settings
4. Contact support if issues persist

### Permission Errors
**Issue**: Collaborators can't access base
**Solution**:
1. Verify email addresses are correct
2. Check spam folders for invitations
3. Ensure Google account access is granted
4. Resend invitations if needed

### Performance Issues
**Issue**: Base loading slowly
**Solution**:
1. Reduce number of records displayed in views
2. Simplify complex formulas
3. Remove unused fields and views
4. Consider splitting large bases

## Best Practices

### Security
- Regularly review who has access to your bases
- Use appropriate permission levels (don't give everyone editor access)
- Be cautious with public sharing links
- Remove access for former team members promptly

### Organization
- Use consistent naming conventions across all bases
- Document your base structure and relationships
- Create views for different user needs
- Keep related data together in the same base

### Collaboration
- Set clear guidelines for data entry
- Use comments to communicate about specific records
- Create different views for different team roles
- Provide training for new collaborators

### Data Quality
- Establish data entry standards
- Use field validation where possible
- Regularly clean up duplicate or outdated records
- Monitor for data inconsistencies

Need help with a specific base management task? Check our [troubleshooting guide](./troubleshooting.md) or contact support.