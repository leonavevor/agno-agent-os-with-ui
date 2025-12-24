# UI Style Guide

This document outlines the consistent styling standards applied across the Agent UI to ensure a cohesive look and feel.

## Design Tokens

### Border Radius
- **Standard corners**: `rounded-xl` (12px) - Used for all buttons, inputs, cards, modals, and containers
- **Small elements**: `rounded-md` (6px) - Used for badges and small chips
- **Pills**: `rounded-full` - Used for status indicators and avatar elements

### Heights
- **Standard buttons**: `h-9` (36px)
- **Standard inputs**: `h-9` (36px)
- **Icon buttons**: `h-6 w-6` or `h-9 w-9`

### Borders
- **Primary borders**: `border-primary/15` (15% opacity)
- **Lighter borders**: `border-primary/10` (10% opacity)
- **Active borders**: `border-primary/30` (30% opacity)
- **Container borders**: `border-primary/20` (20% opacity)

### Backgrounds
- **Input fields**: `bg-accent` - Standard background for interactive inputs
- **Containers**: `bg-accent/30` (30% opacity) - Used for cards, panels, and sections
- **Active states**: `bg-accent/50` (50% opacity) - Used for selected items
- **Inactive states**: `bg-accent/20` (20% opacity) - Used for disabled or unselected items

### Typography
- **UI labels**: `text-[10px]` - Small labels like "Endpoint", "Token"
- **Standard text**: `text-xs` - Default for most UI elements
- **Body text**: `text-sm` - Readable body content
- **Headings**: `text-sm font-semibold uppercase` - Section titles

### Spacing
- **Default gap**: `gap-2` (8px) - Standard spacing between elements
- **Larger gap**: `gap-3` (12px) - Used in lists and forms
- **Section gap**: `gap-4` (16px) - Between major sections
- **Padding**: `p-3` (12px) - Standard padding for containers
- **Inline padding**: `px-3 py-2` - For buttons and interactive elements

## Component Patterns

### Buttons

#### Primary Action Button
```tsx
<Button className="h-9 rounded-xl uppercase">
  Action
</Button>
```

#### Secondary/Outline Button
```tsx
<Button 
  variant="outline" 
  className="h-9 rounded-xl uppercase"
>
  Action
</Button>
```

#### Icon Button
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-9 w-9"
>
  <Icon type="icon-name" size="xs" />
</Button>
```

### Input Fields

#### Standard Input
```tsx
<Input 
  placeholder="Enter value..."
  className="h-9 rounded-xl border-primary/15 bg-accent text-xs"
/>
```

#### TextArea
```tsx
<TextArea 
  placeholder="Enter description..."
  className="rounded-xl border-primary/15 bg-accent text-xs min-h-[60px]"
/>
```

#### Search Input
```tsx
<input
  type="search"
  placeholder="Search..."
  className="h-9 w-full rounded-xl border border-primary/15 bg-accent pl-9 pr-3 text-xs text-muted placeholder:text-muted/60 focus:border-primary focus:outline-none"
/>
```

### Cards & Containers

#### Standard Card
```tsx
<div className="rounded-xl border border-primary/15 p-3 bg-accent/30">
  {/* Card content */}
</div>
```

#### Interactive Card
```tsx
<div className={`
  rounded-xl border p-3 transition-colors
  ${isActive 
    ? 'border-primary/30 bg-accent/50' 
    : 'border-primary/10 bg-accent/20 hover:border-primary/30'
  }
`}>
  {/* Card content */}
</div>
```

#### Form Container
```tsx
<div className="rounded-xl border border-primary/20 bg-accent/30 p-4 space-y-3">
  {/* Form fields */}
</div>
```

### Modal Dialogs

#### Modal Container
```tsx
<DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-xl border-primary/15 font-dmmono">
  <DialogHeader>
    <DialogTitle className="text-lg font-semibold uppercase">
      Title
    </DialogTitle>
    <DialogDescription className="text-xs text-muted-foreground">
      Description
    </DialogDescription>
  </DialogHeader>
  {/* Modal content */}
</DialogContent>
```

### Loading States

#### Skeleton Loader
```tsx
<div className="h-24 animate-pulse rounded-xl border border-primary/10 bg-accent/30" />
```

### Status Indicators

#### Badge
```tsx
<Badge 
  variant={isActive ? 'default' : 'secondary'}
  className="text-[10px] uppercase"
>
  Status
</Badge>
```

#### Status Dot
```tsx
<div className={`h-2 w-2 rounded-full ${
  isConnected ? 'bg-green-500' : 'bg-red-500'
}`} />
```

## Animation & Transitions

### Standard Transitions
- **Duration**: `duration-200` (200ms) - Standard for most animations
- **Easing**: Default CSS easing or `ease-in-out`
- **Properties**: `transition-colors` for color changes, `transition-all` for complex transitions

### Hover States
```tsx
className="hover:bg-accent hover:text-foreground transition-colors duration-200"
```

### Framer Motion Animations
```tsx
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  exit={{ opacity: 0, height: 0 }}
  transition={{ duration: 0.2 }}
>
  {/* Content */}
</motion.div>
```

## Color Usage

### Text Colors
- **Primary text**: Default foreground color
- **Muted text**: `text-muted` or `text-muted-foreground`
- **Accent text**: `text-primary`
- **Destructive text**: `text-destructive`

### Interactive Elements
- **Default state**: `text-muted-foreground`
- **Hover state**: `hover:text-foreground` or `hover:text-primary`
- **Active state**: `text-primary`
- **Disabled state**: `opacity-60`

## Spacing Guidelines

### Gap Sizes
- `gap-1` (4px) - Tight spacing for related elements
- `gap-1.5` (6px) - Chip spacing
- `gap-2` (8px) - **Default spacing**
- `gap-3` (12px) - List items, form fields
- `gap-4` (16px) - Major sections

### Padding Sizes
- `p-2` (8px) - Compact containers
- `p-3` (12px) - **Standard containers**
- `p-4` (16px) - Spacious containers

## Best Practices

1. **Consistency First**: Always use the standard design tokens rather than arbitrary values
2. **Accessible Contrast**: Ensure text has sufficient contrast against backgrounds
3. **Touch Targets**: Minimum 36px (h-9) for interactive elements
4. **Visual Hierarchy**: Use consistent font sizes and weights to establish hierarchy
5. **State Feedback**: Provide clear visual feedback for hover, active, and disabled states
6. **Smooth Transitions**: All interactive elements should have transition animations
7. **Responsive Design**: Components should adapt gracefully to different screen sizes
8. **Loading States**: Always provide loading indicators for async operations
9. **Error Handling**: Display clear error messages with appropriate styling
10. **Icon Consistency**: Use the same icon size (`xs`) for similar contexts

## Component-Specific Guidelines

### Sidebar
- Fixed width: `16rem` (expanded) / `2.5rem` (collapsed)
- Vertical spacing: `space-y-5`
- Background: Inherits from theme

### System Section
- Labels: `text-[10px] font-medium uppercase text-muted-foreground`
- Inputs: Standard h-9 with rounded-xl
- Hover states: Show edit hints with smooth transitions

### Modals
- Max width: `max-w-2xl` (small) / `max-w-4xl` (large)
- Max height: `max-h-[85vh]`
- Overflow: Enable scrolling for content overflow
- Font: `font-dmmono`

### Connection Status
- Container: `rounded-xl border border-primary/15 bg-accent/30`
- Expandable: Default expanded state
- Status colors: Green (connected), Yellow (reconnecting), Red (disconnected)

### Skills & Projects
- Card grid: `space-y-3` for list items
- Empty states: Centered with icon, 2-line message
- Bulk actions: Right-aligned button group

## Migration Notes

All components have been updated to follow these standards:
- ✅ SystemHealthIndicator.tsx
- ✅ Sidebar.tsx
- ✅ SkillsModal.tsx
- ✅ ProjectModal.tsx
- ✅ All form inputs and buttons standardized
- ✅ All containers using consistent rounded-xl
- ✅ All borders using standard opacity values

## Future Considerations

- Consider adding dark mode specific adjustments
- Evaluate accessibility features (ARIA labels, keyboard navigation)
- Add motion reduce preferences support
- Document component composition patterns
- Create Storybook documentation for all patterns
