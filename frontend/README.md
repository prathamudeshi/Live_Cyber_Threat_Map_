# Deepcytes LCTM Feature with News Animation

A modern React-based dashboard component featuring an animated news feed with flip card animations and real-time updates.

## Features

- **Animated News Feed**: Beautiful flip card animations for news items
- **Real-time Updates**: Support for Server-Sent Events (SSE) for live news updates
- **Responsive Design**: Modern UI with smooth animations and transitions
- **Pagination**: Smart pagination with dynamic page dots
- **Title Truncation**: Automatic text truncation for long news titles
- **Custom Styling**: Tailwind CSS integration with custom animations

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- React (v16.8 or higher)
- TypeScript

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd Deepcytes-LCTM-feature-new-animation
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

## Usage

The News component can be imported and used in your React application:

```tsx
import News from "./components/news";

function App() {
  return (
    <div>
      <News
        useSSE={true} // Enable Server-Sent Events for real-time updates
        itemsPerPage={3} // Number of news items to display per page
      />
    </div>
  );
}
```

### Props

| Prop         | Type    | Default | Description                                     |
| ------------ | ------- | ------- | ----------------------------------------------- |
| useSSE       | boolean | false   | Enable Server-Sent Events for real-time updates |
| itemsPerPage | number  | 3       | Number of news items to display per page        |

## Features in Detail

### Flip Card Animation

- Smooth 3D flip animations for news items
- Direction-aware flipping (forward/backward)
- Customizable animation timing and easing
- Hover effects with subtle scaling

### News Item Display

- Title truncation for long headlines
- Timestamp formatting
- Source link integration
- Visual indicators for older news items

### Pagination

- Dynamic page dots with smart truncation
- Previous/Next navigation buttons
- Current page indicator
- Smooth transitions between pages

### Styling

- Tailwind CSS integration
- Custom scrollbar styling
- Responsive design
- Dark theme optimized

## Development

### Project Structure

```
src/
  ├── components/
  │   └── news.tsx       # Main News component
  ├── data/
  │   └── sseNews.ts     # News data handling
  └── types/
      └── index.ts       # TypeScript type definitions
```

### Adding New Features

1. For new animations:

   - Add CSS keyframes in the style section
   - Update the component's className logic

2. For new news sources:
   - Modify the `fetchNewsData` function in `sseNews.ts`
   - Update the NewsItem interface if needed

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- React team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Contributors and maintainers of the project
