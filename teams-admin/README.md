# Teams Admin

An internal self-service tool built for managing customer communication channels for discussing Edge Delivery Services (EDS). This application provides a web-based interface for managing Microsoft Teams, including team creation (hidden by default), member management, and team search functionality.

## Features

### 🔍 **Team Search & Discovery**
- Search teams by name and description
- Real-time filtering with configurable parameters
- Batch loading with performance optimization
- View team statistics (active teams, created teams)

### 👥 **Team Management**
- **Create New Teams**: Full team creation workflow with custom settings (hidden by default)
- **Member Management**: View and manage team members
- **Add Users**: Bulk user addition to existing teams
- **Team Details**: Comprehensive team information display

### 🎛️ **Administrative Controls**
- Conditional team creation (enabled via URL parameter)
- Progress tracking for bulk operations
- Error handling and user feedback
- Responsive design for various screen sizes

### 🔐 **Authentication & Security**
- User profile integration
- Role-based access control
- Secure API communication
- Local development support

## Architecture

### 📁 **Modular Structure**
```
teams-admin/
├── index.html              # Main application entry point
├── main.js                 # Application bootstrap
├── main.css                # Main stylesheet with imports
├── config.js               # API configuration
├── api.js                  # API communication layer
├── utils.js                # Utility functions
├── modal.js                # Modal management
├── userProfile.js          # User authentication
├── members.js              # Member management
├── authentication.js       # Auth helpers
├── components/             # Modular components
│   ├── applicationSetup.js # App initialization
│   ├── constants.js        # Application constants
│   ├── errorHandler.js     # Error management
│   ├── performanceOptimizer.js # Performance utilities
│   ├── teamForms.js        # Team creation/editing forms
│   ├── teamSearch.js       # Search functionality
│   └── teamTable.js        # Team display and management
└── styles/                 # Modular CSS
    ├── base.css            # Base styles
    └── components/         # Component-specific styles
        ├── form.css        # Form styling
        ├── modal.css       # Modal styling
        ├── progress.css    # Progress indicators
        └── table.css       # Table styling
```

### 🏗️ **Key Components**

- **ApplicationSetup**: Handles app initialization, user profile setup, and URL parameter processing
- **TeamTable**: Manages team display, sorting, and row-level actions
- **TeamSearch**: Handles search functionality and result filtering
- **TeamForms**: Manages team creation and member addition workflows
- **PerformanceOptimizer**: Provides throttling, debouncing, and batch processing
- **ErrorHandler**: Centralized error management and user notifications

## Setup & Installation

### Prerequisites
- AEM CLI (`aem` command)
- Node.js (for local development)
- Access to Microsoft Teams API endpoints

### Local Development

1. **Start AEM Development Server**
   ```bash
   cd eds-channel-tracker
   aem up
   ```

2. **Access the Application**
   ```
   http://localhost:3000/teams-admin/
   ```

3. **Local Authentication**
   For development, append user parameters:
   ```
   http://localhost:3000/teams-admin/?email=user@example.com&name=User%20Name
   ```

### Configuration

#### API Endpoints
The application automatically configures API endpoints based on environment:
- **Development**: `http://localhost:8787`
- **Production**: `https://eds-teams-channel-worker.chrislotton.workers.dev`

## Usage

### Basic Operations

#### 🔍 **Searching Teams**
1. Enter search criteria in the "Name Contains" field (default: "aem-")
2. Optionally filter by description
3. Click "Search" to retrieve results
4. Teams are displayed in a sortable table

#### 👥 **Viewing Team Members**
1. Click the "👥" icon in any team row
2. Modal displays current team members
3. Use "Add Users" button to add new members

#### ➕ **Creating Teams** (Admin Only)
1. Click "Create New Team" button
2. Fill in team details:
   - Team name
   - Description  
   - Visibility settings
   - Initial members
3. Submit to create team

#### 👤 **Adding Team Members**
1. From team members modal, click "Add Users"
2. Enter email addresses (comma-separated)
3. Select member roles
4. Submit to add users

### Advanced Features

#### 📊 **Performance Monitoring**
- Progress bars for bulk operations
- Real-time status updates
- Error reporting and retry mechanisms

#### 🎨 **UI Customization**
- Responsive design adapts to screen size
- Modal drag functionality
- Sortable table columns
- Visual progress indicators

## API Integration

### Authentication
The application integrates with existing EDS authentication:
- Automatic profile detection on production
- Manual profile for local development
- Secure token handling

### Endpoints
- `GET /teams` - Search and retrieve teams
- `POST /teams` - Create new team
- `GET /teams/{id}/members` - Get team members
- `POST /teams/{id}/members` - Add team members

## Development

### Adding New Features

1. **Create Component**: Add new component in `components/` directory
2. **Import in main.js**: Add import and initialization
3. **Add Styles**: Create corresponding CSS in `styles/components/`
4. **Update Constants**: Add any new constants to `constants.js`

### Code Style
- ES6+ modules with imports/exports
- Async/await for API calls
- Error handling with try/catch
- Performance optimization for bulk operations

### Testing
- Test in both localhost and production environments
- Test bulk operations with progress tracking
- Validate responsive design on various screen sizes

## Troubleshooting

### Common Issues

**404 Errors on Resources**
- Ensure AEM server is running from correct directory
- Verify file paths in HTML imports
- Check that `eds-channel-tracker` directory structure is correct

**Authentication Issues**
- For localhost: append `?email=user@domain.com&name=User%20Name` to URL
- For production: ensure proper EDS authentication setup

**API Connection Problems**
- Check network connectivity
- Verify API endpoint configuration in `config.js`
- Review browser console for detailed error messages

**Performance Issues**
- Monitor browser console for batch processing logs
- Check for network throttling
- Verify performance optimizer settings in constants

## Support

For issues and suggestions:
- 💬 [Slack Channel](https://adobe-dx-support.enterprise.slack.com/archives/C08LDR6NP1V)
- 🐛 Report bugs through appropriate channels
- 💡 Feature requests welcome

---

**Built with ❤️ for Edge Delivery Services** 
