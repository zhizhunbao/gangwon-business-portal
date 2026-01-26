# Windsurf Configuration

This directory contains the Windsurf configuration for the Gangwon Business Portal project.

## 📁 Directory Structure

```
.windsurf/
├── skills/                    # Project-specific Skills
│   ├── frontend-development/  # Frontend development workflow
│   └── backend-development/   # Backend development workflow
├── workflows/                 # Automated workflows
│   ├── deployment.yml        # Deployment workflow
│   └── code-review.yml       # Code review workflow
├── config.json               # Main configuration file
└── README.md                 # This file
```

## 🚀 Available Skills

### Frontend Development
- **Name**: `frontend-development`
- **Purpose**: React + Vite + Zustand + i18n development
- **Features**:
  - Component templates
  - Store management templates
  - Code quality checks
  - Component development checklist

### Backend Development
- **Name**: `backend-development`
- **Purpose**: Supabase + Node.js development
- **Features**:
  - API controller templates
  - Database migration templates
  - Supabase function templates

## 🔄 Available Workflows

### Deployment Workflow
- **File**: `deployment.yml`
- **Purpose**: Automated deployment to production
- **Steps**:
  1. Pre-deployment checks
  2. Security scan
  3. Database backup
  4. Frontend deployment
  5. Backend deployment
  6. Health checks
  7. Post-deployment verification

### Code Review Workflow
- **File**: `code-review.yml`
- **Purpose**: Automated code review process
- **Steps**:
  1. Static analysis
  2. Security check
  3. Test coverage
  4. Performance check
  5. Dependency analysis

## ⚙️ Configuration

### Main Config (`config.json`)
- Skills and workflows settings
- Quality gates configuration
- Notification settings
- Environment-specific configurations
- Integration settings

### Quality Gates
- Test coverage threshold: 80%
- Performance threshold: 90%
- Security scan required: Yes

## 🎯 Usage

### Using Skills
Skills are automatically invoked when relevant tasks are detected. You can also manually invoke them:

```bash
# Invoke frontend development skill
"windsurf: use frontend-development skill to create a new component"

# Invoke backend development skill
"windsurf: use backend-development skill to create a new API endpoint"
```

### Running Workflows
Workflows can be triggered manually or through hooks:

```bash
# Run deployment workflow
"windsurf: run deployment workflow"

# Run code review workflow
"windsurf: run code review workflow"
```

## 🔧 Customization

### Adding New Skills
1. Create a new directory under `.windsurf/skills/`
2. Add a `SKILL.md` file with proper frontmatter
3. Add templates, scripts, and checklists as needed

### Adding New Workflows
1. Create a new `.yml` file under `.windsurf/workflows/`
2. Define steps, quality gates, and notifications
3. Test the workflow before production use

### Updating Configuration
Modify `.windsurf/config.json` to:
- Enable/disable features
- Adjust quality thresholds
- Configure notifications
- Set environment-specific settings

## 📋 Best Practices

1. **Keep skills focused**: Each skill should handle a specific domain
2. **Version control**: Track changes to skills and workflows
3. **Test thoroughly**: Test skills and workflows in development first
4. **Document updates**: Keep README files up to date
5. **Monitor performance**: Regularly check workflow execution times

## 🚨 Troubleshooting

### Common Issues
- **Skills not found**: Check directory structure and file naming
- **Workflows failing**: Verify YAML syntax and command availability
- **Configuration errors**: Validate JSON syntax in config.json

### Getting Help
1. Check Windsurf documentation: https://docs.windsurf.com
2. Review skill specifications: https://agentskills.io
3. Contact development team for project-specific issues

## 📊 Monitoring

Monitor skill and workflow usage through:
- Windsurf analytics dashboard
- Custom logs in project
- Notification systems configured in config.json
