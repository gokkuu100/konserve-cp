# Contributing to Konserve

Thank you for your interest in contributing to Konserve! We welcome contributions from developers who share our vision of creating sustainable waste management solutions through technology.

## 🌱 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive to all contributors
- Focus on constructive feedback and collaboration
- Respect different viewpoints and experiences
- Show empathy towards other community members
- Use welcoming and inclusive language

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18+ installed
- Git version control
- Basic knowledge of React Native and TypeScript
- Understanding of mobile app development principles
- Familiarity with Supabase (helpful but not required)

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/konserve.git
   cd konserve
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/originalowner/konserve.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Set up environment variables** (see README.md for details)
6. **Start the development server**:
   ```bash
   npm start
   ```

## 📋 Types of Contributions

We welcome various types of contributions:

### 🐛 Bug Reports
- Use the GitHub issue template
- Include steps to reproduce
- Provide screenshots if applicable
- Specify device/platform information

### ✨ Feature Requests
- Describe the feature and its benefits
- Explain the use case
- Consider environmental impact implications
- Provide mockups or wireframes if possible

### 🔧 Code Contributions
- Bug fixes
- New features
- Performance improvements
- UI/UX enhancements
- Documentation updates

### 📖 Documentation
- README improvements
- Code comments
- API documentation
- User guides
- Contributing guidelines

## 🔄 Development Workflow

### Branch Naming Convention

Use descriptive branch names with prefixes:

- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Critical fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements

Examples:
- `feature/ai-waste-detection-improvement`
- `bugfix/payment-processing-error`
- `docs/api-integration-guide`

### Commit Message Format

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(ai): add support for hazardous waste detection
fix(payment): resolve M-Pesa integration timeout issue
docs(readme): update installation instructions
```

### Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with clear, focused commits

3. **Test your changes** thoroughly:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

4. **Update documentation** if needed

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** with:
   - Clear title and description
   - Screenshots for UI changes
   - Reference to related issues
   - Testing instructions

### Pull Request Guidelines

- Keep PRs focused and atomic
- Include tests for new functionality
- Update documentation as needed
- Ensure all CI checks pass
- Request review from maintainers
- Be responsive to feedback

## 🧪 Testing Guidelines

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- UserDashboard.test.js
```

### Writing Tests

- Write tests for new features and bug fixes
- Use descriptive test names
- Test both happy path and edge cases
- Mock external dependencies appropriately
- Follow the existing test structure

### Test Coverage

- Aim for high test coverage on critical paths
- Focus on business logic and user interactions
- Don't prioritize coverage over meaningful tests

## 🎨 Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for type safety
- Follow existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Prefer const over let, avoid var

### React Native

- Use functional components with hooks
- Follow React Native best practices
- Optimize for performance (avoid unnecessary re-renders)
- Use proper key props for lists
- Handle loading and error states appropriately

### Styling

- Use StyleSheet.create() for styles
- Follow the existing design system
- Ensure accessibility compliance
- Test on different screen sizes
- Use consistent spacing and typography

### File Organization

- Place files in appropriate directories
- Use clear, descriptive file names
- Group related functionality together
- Export components and utilities clearly

## 🌍 Environmental Focus

When contributing to Konserve, consider:

- **Sustainability Impact**: How does your contribution support waste reduction?
- **User Education**: Does it help users make better environmental choices?
- **Efficiency**: Does it improve resource utilization?
- **Accessibility**: Is it accessible to diverse user groups?

## 📚 Resources

### Learning Materials
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Expo Documentation](https://docs.expo.dev/)

### Design Resources
- [React Native Design Guidelines](https://reactnative.dev/docs/design)
- [Material Design](https://material.io/design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## 🤝 Community

### Getting Help

- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Discord/Slack**: Real-time chat (if available)

### Mentorship

New contributors are welcome! If you're new to:
- React Native development
- Open source contribution
- Environmental tech
- Mobile app development

Feel free to reach out for guidance and mentorship.

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special mentions in community updates

## 📋 Issue Templates

When creating issues, use our templates:

### Bug Report Template
```markdown
**Bug Description**
A clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen

**Screenshots**
Add screenshots if applicable

**Environment**
- Device: [e.g. iPhone 12, Samsung Galaxy S21]
- OS: [e.g. iOS 15.0, Android 11]
- App Version: [e.g. 1.2.0]
```

### Feature Request Template
```markdown
**Feature Description**
A clear description of the proposed feature

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should this feature work?

**Environmental Impact**
How does this support waste management goals?

**Additional Context**
Add any other context, mockups, or examples
```

## 🔒 Security

If you discover security vulnerabilities:

1. **DO NOT** create public GitHub issues
2. Email security concerns to: security@konserve.co.ke
3. Provide detailed information about the vulnerability
4. Allow reasonable time for patching before disclosure

## 📄 License

By contributing to Konserve, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

Thank you for contributing to a more sustainable future! 🌱

*Together, we're building technology that makes waste management smarter, communities stronger, and our environment cleaner.*
