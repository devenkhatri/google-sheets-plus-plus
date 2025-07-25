# Understanding Views

Views are different ways to display and interact with the same data. Each view can have its own filters, sorts, and field visibility settings while showing the same underlying records.

## What are Views?

Think of views as different lenses through which you can examine your data:
- **Grid View**: Spreadsheet-like table (default)
- **Kanban View**: Cards organized by status or category
- **Calendar View**: Records displayed on a calendar
- **Gallery View**: Cards with image previews

All views show the same data but present it differently for various use cases.

## Grid View

The Grid view displays your data in a familiar spreadsheet format.

### Features
- **Sortable Columns**: Click headers to sort
- **Resizable Columns**: Drag column borders
- **Frozen Columns**: Keep important columns visible while scrolling
- **Row Height**: Adjust for better readability
- **Inline Editing**: Click cells to edit directly

### Best Use Cases
- Data entry and bulk editing
- Detailed record review
- Importing/exporting data
- Working with many fields simultaneously

### Customization Options
1. **Field Visibility**: Hide/show specific fields
2. **Field Order**: Drag columns to reorder
3. **Row Height**: Choose from Short, Medium, or Tall
4. **Frozen Columns**: Lock columns to the left
5. **Group Records**: Group by field values

## Kanban View

Kanban view organizes records as cards in columns based on a single-select field.

### Setting Up Kanban View
1. Create a new view and select "Kanban"
2. Choose a **Single Select** field for grouping (e.g., Status, Priority)
3. Select which fields to display on cards
4. Configure card appearance and sorting

### Features
- **Drag and Drop**: Move cards between columns to update status
- **Card Customization**: Choose which fields appear on cards
- **Column Sorting**: Sort cards within columns
- **Color Coding**: Cards inherit colors from the grouping field
- **Quick Actions**: Edit records directly from cards

### Best Use Cases
- Project management (To Do, In Progress, Done)
- Sales pipeline (Lead, Qualified, Proposal, Closed)
- Content workflow (Draft, Review, Published)
- Bug tracking (Open, In Progress, Testing, Closed)

### Kanban Tips
- Use meaningful status names for column headers
- Keep card information concise but informative
- Set up automation to move cards based on field changes
- Use colors strategically to indicate priority or type

## Calendar View

Calendar view displays records on a calendar based on date fields.

### Setting Up Calendar View
1. Create a new view and select "Calendar"
2. Choose a **Date** field for positioning events
3. Select fields to display in event details
4. Configure color coding (optional)

### Features
- **Multiple Calendar Types**: Month, Week, Day views
- **Event Creation**: Click dates to create new records
- **Drag to Reschedule**: Move events to different dates
- **Color Coding**: Color events by field values
- **Event Details**: Click events to see full record information

### Best Use Cases
- Event planning and scheduling
- Project timeline management
- Content publishing calendar
- Appointment scheduling
- Deadline tracking

### Calendar Tips
- Use descriptive event titles (primary field)
- Color-code by priority, type, or assignee
- Include time information for precise scheduling
- Use recurring events for regular activities

## Gallery View

Gallery view displays records as cards with prominent image display.

### Setting Up Gallery View
1. Create a new view and select "Gallery"
2. Choose an **Attachment** field for the main image
3. Select additional fields to display on cards
4. Configure card size and layout

### Features
- **Image Previews**: Large, prominent image display
- **Card Layouts**: Different sizes and arrangements
- **Lightbox View**: Click images for full-size viewing
- **Responsive Grid**: Automatically adjusts to screen size
- **Quick Edit**: Edit records directly from cards

### Best Use Cases
- Product catalogs
- Portfolio management
- Real estate listings
- Recipe collections
- Team member directories

### Gallery Tips
- Use high-quality images for best appearance
- Keep card text concise
- Organize by categories or tags
- Use consistent image dimensions when possible

## Creating and Managing Views

### Creating a New View
1. Click the **"+ Add View"** button next to existing view tabs
2. Select the view type
3. Give your view a descriptive name
4. Configure initial settings
5. Click **"Create View"**

### View Settings
Access view settings by clicking the dropdown arrow next to the view name:

- **Rename View**: Change the view name
- **Duplicate View**: Create a copy with the same settings
- **Delete View**: Remove the view (doesn't delete data)
- **View Description**: Add notes about the view's purpose

### Sharing Views
- **View Links**: Share direct links to specific views
- **Embed Views**: Embed read-only views in websites
- **Export View**: Export data as it appears in the view

## Filtering in Views

Each view can have its own set of filters to show only relevant records.

### Adding Filters
1. Click the **"Filter"** button in the view toolbar
2. Choose a field to filter by
3. Select a condition (equals, contains, greater than, etc.)
4. Enter the filter value
5. Click **"Apply"**

### Filter Conditions
- **Text Fields**: Contains, does not contain, is, is not, is empty, is not empty
- **Number Fields**: =, ≠, >, <, ≥, ≤, is empty, is not empty
- **Date Fields**: Is, is before, is after, is within, is empty, is not empty
- **Select Fields**: Is, is not, is any of, is none of, is empty, is not empty
- **Checkbox Fields**: Is checked, is not checked

### Advanced Filtering
- **Multiple Filters**: Combine filters with AND/OR logic
- **Filter Groups**: Create complex filter combinations
- **Date Ranges**: Use relative dates (today, this week, last month)
- **Formula Filters**: Filter based on calculated values

## Sorting in Views

Control the order in which records appear in your views.

### Basic Sorting
1. Click any column header in Grid view
2. Choose ascending (A→Z) or descending (Z→A)
3. The view will update immediately

### Advanced Sorting
1. Click the **"Sort"** button in the view toolbar
2. Add multiple sort criteria
3. Drag to reorder sort priority
4. Choose ascending or descending for each

### Sort Priority
When using multiple sorts:
1. Primary sort is applied first
2. Secondary sort breaks ties in primary sort
3. Continue for additional sort levels

## View Performance

### Optimizing Large Views
- **Limit Records**: Use filters to reduce the number of displayed records
- **Hide Unused Fields**: Only show fields you need
- **Simplify Formulas**: Complex calculations can slow view loading
- **Use Appropriate View Types**: Choose the most efficient view for your use case

### View Loading Tips
- **Pagination**: Large views automatically paginate
- **Lazy Loading**: Images and attachments load as needed
- **Caching**: Frequently accessed views are cached for speed
- **Background Updates**: Views update in the background when data changes

## View Collaboration

### Shared Views
- All collaborators see the same views
- Changes to view settings affect all users
- Personal views can be created for individual preferences

### View Permissions
- **Editors**: Can create, modify, and delete views
- **Commenters**: Can use existing views but not modify them
- **Viewers**: Can only use existing views

### Best Practices for Team Views
1. **Descriptive Names**: Make view purposes clear
2. **Consistent Filters**: Use standard criteria across similar views
3. **Role-Based Views**: Create views for different team roles
4. **Documentation**: Use view descriptions to explain purpose
5. **Regular Cleanup**: Remove unused or outdated views

## Common View Patterns

### Project Management
- **All Tasks** (Grid): Complete task list with all details
- **My Tasks** (Grid): Filtered to current user's assignments
- **Sprint Board** (Kanban): Tasks organized by status
- **Timeline** (Calendar): Project milestones and deadlines
- **Team Workload** (Grid): Grouped by assignee

### Sales Pipeline
- **All Deals** (Grid): Complete deal information
- **Pipeline** (Kanban): Deals organized by stage
- **This Month** (Grid): Deals closing this month
- **Won Deals** (Gallery): Showcase successful deals
- **Activity Calendar** (Calendar): Scheduled calls and meetings

### Content Management
- **Content Calendar** (Calendar): Publishing schedule
- **Editorial Board** (Kanban): Content by status
- **All Articles** (Grid): Complete content database
- **Published Content** (Gallery): Visual content showcase
- **Author Assignments** (Grid): Grouped by writer

## Troubleshooting Views

### Common Issues

**View Not Loading**
- Check internet connection
- Refresh the page
- Clear browser cache
- Try a different view type

**Missing Records**
- Check view filters
- Verify record permissions
- Look for hidden fields
- Check date ranges in filters

**Slow Performance**
- Reduce number of displayed records
- Hide unused fields
- Simplify complex formulas
- Use more specific filters

**Drag and Drop Not Working**
- Ensure you have edit permissions
- Check if the field allows the operation
- Try refreshing the view
- Verify browser compatibility

### Getting Help
- Use the **"?"** help icon in view settings
- Check the [troubleshooting guide](./troubleshooting.md)
- Contact support for persistent issues

Views are powerful tools for organizing and presenting your data. Experiment with different view types and settings to find what works best for your workflow!