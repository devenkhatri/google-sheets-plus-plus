# Working with Tables and Fields

Tables are the foundation of your base, organizing data into rows (records) and columns (fields). This guide covers creating, managing, and optimizing tables and fields.

## Understanding Tables

A table is a collection of related records with the same structure. Each table has:
- **Fields** (columns): Define what type of data you store
- **Records** (rows): Individual entries containing your data
- **Views**: Different ways to display and organize the same data

## Creating Tables

### Adding a New Table
1. Click **"+ Add Table"** in your base
2. Enter a table name (e.g., "Contacts", "Projects", "Inventory")
3. Choose to start with:
   - **Empty table**: Start from scratch
   - **Import data**: Upload a CSV or Excel file
   - **Template**: Use a pre-built table structure
4. Click **"Create Table"**

### Table Naming Best Practices
- Use plural nouns (e.g., "Tasks" not "Task")
- Be descriptive but concise
- Avoid special characters
- Use consistent naming across your base

## Working with Fields

Fields define the type of information stored in each column.

### Basic Field Types

#### Text Field
- **Use for**: Names, descriptions, notes, addresses
- **Options**: 
  - Single line or long text
  - Character limits
  - Default values
- **Example**: Customer name, product description

#### Number Field
- **Use for**: Quantities, prices, scores, measurements
- **Options**:
  - Decimal places (0-8)
  - Number format (1,000 vs 1000)
  - Negative numbers allowed
- **Example**: Price ($), quantity, rating

#### Date Field
- **Use for**: Deadlines, birthdays, events, timestamps
- **Options**:
  - Date only or date and time
  - Date format (MM/DD/YYYY, DD/MM/YYYY, etc.)
  - Default to today
- **Example**: Due date, created date, meeting time

#### Checkbox Field
- **Use for**: Yes/no, completed/incomplete, true/false
- **Options**:
  - Default checked or unchecked
  - Custom labels
- **Example**: Task completed, email sent, active status

#### Single Select Field
- **Use for**: Status, priority, category (one choice only)
- **Options**:
  - Custom option names and colors
  - Default selection
  - Allow other values
- **Example**: Priority (High/Medium/Low), Status (To Do/In Progress/Done)

#### Multi Select Field
- **Use for**: Tags, skills, categories (multiple choices)
- **Options**:
  - Custom option names and colors
  - Maximum selections
- **Example**: Skills, tags, departments

#### Attachment Field
- **Use for**: Files, images, documents
- **Options**:
  - File type restrictions
  - Maximum file size
  - Maximum number of files
- **Example**: Profile photos, contracts, receipts

### Advanced Field Types

#### Formula Field
- **Use for**: Calculated values based on other fields
- **Features**:
  - Mathematical operations
  - Text manipulation
  - Date calculations
  - Conditional logic
- **Example**: `{Price} * {Quantity}`, `CONCATENATE({First Name}, " ", {Last Name})`

#### Lookup Field
- **Use for**: Displaying values from linked records
- **Requirements**: Must have a Link field first
- **Example**: Show customer name from linked customer record

#### Rollup Field
- **Use for**: Aggregating values from linked records
- **Functions**: SUM, AVERAGE, COUNT, MAX, MIN, etc.
- **Example**: Total order value from all order items

#### Link Field
- **Use for**: Connecting records between tables
- **Options**:
  - Allow linking to multiple records
  - Restrict to single record
- **Example**: Link tasks to projects, orders to customers

## Managing Fields

### Adding Fields
1. Click the **"+"** button next to existing field headers
2. Select field type from the dropdown
3. Configure field options
4. Enter field name
5. Click **"Save"**

### Editing Fields
1. Click the field header dropdown arrow
2. Select **"Edit Field"**
3. Modify settings (name, type, options)
4. Click **"Save Changes"**

**Note**: Changing field types may result in data loss. Always backup before major changes.

### Reordering Fields
- **Drag and Drop**: Click and drag field headers to reorder
- **Field Settings**: Use the field menu to move left/right
- **View Settings**: Reorder fields in specific views without affecting the base structure

### Deleting Fields
1. Click the field header dropdown
2. Select **"Delete Field"**
3. Confirm deletion (this cannot be undone)

**Warning**: Deleting fields permanently removes all data in that column.

## Field Validation and Constraints

### Text Field Validation
- **Required**: Field must have a value
- **Unique**: No duplicate values allowed
- **Length limits**: Minimum/maximum character count
- **Pattern matching**: Email format, phone numbers, etc.

### Number Field Validation
- **Range limits**: Minimum and maximum values
- **Integer only**: No decimal places
- **Positive only**: No negative numbers

### Date Field Validation
- **Date range**: Restrict to specific date ranges
- **Future dates only**: Prevent past dates
- **Business days only**: Exclude weekends

### Setting Up Validation
1. Edit the field settings
2. Go to **"Validation"** tab
3. Enable desired validation rules
4. Set parameters for each rule
5. Add custom error messages
6. Save changes

## Table Relationships

### Understanding Links
Links connect records between tables, creating relationships:
- **One-to-Many**: One customer has many orders
- **Many-to-Many**: Many students take many courses
- **One-to-One**: One person has one profile

### Creating Table Links
1. Add a **Link** field to your table
2. Choose which table to link to
3. Configure link options:
   - Allow multiple records
   - Create reverse link field
   - Restrict deletions
4. Save the field

### Working with Linked Records
- **Adding Links**: Click the field and search for records
- **Creating New**: Create new linked records on the fly
- **Viewing Details**: Click linked records to see details
- **Bulk Linking**: Select multiple records to link at once

## Table Management

### Duplicating Tables
1. Right-click table tab
2. Select **"Duplicate Table"**
3. Choose what to copy:
   - Structure only
   - Structure and data
   - Specific views
4. Name the new table
5. Click **"Duplicate"**

### Importing Data into Existing Tables
1. Click **"Import"** in table toolbar
2. Upload your file (CSV, Excel)
3. Map columns to existing fields
4. Handle conflicts (skip, overwrite, create new)
5. Review and import

### Exporting Table Data
1. Click table menu (three dots)
2. Select **"Export Table"**
3. Choose format (CSV, Excel, JSON)
4. Select which fields to include
5. Apply current filters/sorts if desired
6. Download file

### Table Settings
Access via table menu > **"Table Settings"**:
- **Description**: Document table purpose
- **Primary Field**: Choose the main identifier field
- **Record Display**: How records appear in links
- **Permissions**: Table-specific access controls

## Performance Optimization

### Large Tables (1000+ Records)
- **Index Key Fields**: Ensure frequently searched fields are indexed
- **Limit View Records**: Use filters to reduce displayed records
- **Optimize Formulas**: Avoid complex calculations on large datasets
- **Archive Old Data**: Move historical records to separate tables

### Formula Performance
- **Avoid Nested Lookups**: Can slow down large tables
- **Use Rollups Wisely**: Aggregating many records is expensive
- **Cache Results**: Use helper fields for complex calculations
- **Monitor Dependencies**: Too many formula fields can create cascading updates

### Field Optimization
- **Remove Unused Fields**: Clean up fields no longer needed
- **Appropriate Field Types**: Use the most specific type possible
- **Limit Attachments**: Large files can slow sync performance
- **Optimize Links**: Too many linked records can impact performance

## Common Patterns and Use Cases

### Contact Management
```
Fields:
- Name (Text, Primary)
- Email (Text, Email validation)
- Phone (Text, Phone format)
- Company (Link to Companies table)
- Status (Single Select: Active/Inactive)
- Last Contact (Date)
- Notes (Long Text)
```

### Project Tracking
```
Fields:
- Project Name (Text, Primary)
- Status (Single Select: Planning/Active/Complete)
- Start Date (Date)
- Due Date (Date)
- Assigned To (Link to Team Members)
- Priority (Single Select: High/Medium/Low)
- Progress (Number, Percentage)
- Budget (Number, Currency)
```

### Inventory Management
```
Fields:
- Product Name (Text, Primary)
- SKU (Text, Unique)
- Category (Single Select)
- Quantity (Number, Integer)
- Unit Price (Number, Currency)
- Supplier (Link to Suppliers table)
- Reorder Level (Number)
- Last Restocked (Date)
```

## Troubleshooting

### Common Field Issues

**Problem**: Formula not calculating
**Solution**: 
- Check field references are correct
- Ensure linked records exist
- Verify formula syntax
- Check for circular references

**Problem**: Link field not working
**Solution**:
- Verify target table exists
- Check permissions on linked table
- Ensure field types are compatible
- Try recreating the link field

**Problem**: Data not syncing to Google Sheets
**Solution**:
- Check internet connection
- Verify Google Sheets permissions
- Try manual sync
- Check for field type compatibility

### Best Practices

1. **Plan Before Building**: Sketch out your table structure first
2. **Start Simple**: Begin with basic fields, add complexity later
3. **Use Consistent Naming**: Makes collaboration easier
4. **Document Relationships**: Use field descriptions to explain links
5. **Regular Maintenance**: Clean up unused fields and data
6. **Test Changes**: Try modifications on copies first
7. **Backup Important Data**: Export before major structural changes

Need help with specific field types or table structures? Check our [advanced fields guide](./advanced-fields.md) or [troubleshooting section](./troubleshooting.md).