# Tree Folder Component - Test Guide

## 🚀 Quick Start

Navigate to: `http://localhost:3000/tree-test`

## 🧪 Performance Testing

### Test Scenarios

#### 1. Small Dataset (1,000 nodes)

**Purpose**: Verify basic functionality and smooth UX

1. Select "1K nodes" from dropdown
2. Click "Generate New Data"
3. **Expected Results**:
   - Generation time: < 10ms
   - Render time: < 20ms
   - Smooth scrolling at 60fps
   - Instant response to all interactions

#### 2. Medium Dataset (5,000 nodes)

**Purpose**: Test real-world usage scenarios

1. Select "5K nodes" from dropdown
2. Click "Generate New Data"
3. **Expected Results**:
   - Generation time: < 30ms
   - Render time: < 50ms
   - No lag during scroll
   - Drag & drop remains smooth

#### 3. Large Dataset (10,000 nodes)

**Purpose**: Verify virtualization effectiveness

1. Select "10K nodes" from dropdown
2. Click "Generate New Data"
3. **Expected Results**:
   - Generation time: < 60ms
   - Render time: < 80ms
   - Smooth 60fps scrolling maintained
   - All features remain responsive

#### 4. Stress Test (50,000 nodes)

**Purpose**: Push the limits of the implementation

1. Select "50K nodes" from dropdown
2. Click "Generate New Data"
3. **Expected Results**:
   - Generation time: < 250ms
   - Render time: < 200ms
   - Scrolling remains smooth (may see slight delay on initial scroll)
   - All operations functional

## 🎯 Behavior Testing

### Selection Testing

#### Single Select

1. Click any node
2. **Expected**: Node highlights in blue, previous selection clears

#### Multi-Select

1. `Ctrl/Cmd + Click` on multiple nodes
2. **Expected**: All clicked nodes highlight, previous selections persist

#### Range Select

1. Click one node
2. `Shift + Click` another node
3. **Expected**: All nodes between the two are selected

### Keyboard Navigation Testing

#### Arrow Keys

1. Focus the tree (click any node)
2. Press `↓` arrow
3. **Expected**: Focus moves to next visible node and **scrolls into view if needed**
4. Press `↑` arrow
5. **Expected**: Focus moves to previous node and **scrolls into view if needed**
6. Continue pressing up/down rapidly
7. **Expected**: Tree smoothly auto-scrolls to keep focused item visible

#### Expand/Collapse

1. Focus a folder node
2. Press `→` (Right Arrow)
3. **Expected**: Folder expands (if closed) or focus moves to first child (if open)
4. Press `←` (Left Arrow)
5. **Expected**: Folder collapses (if open) or focus moves to parent (if closed)

#### Enter/Space

1. Focus a folder
2. Press `Enter` or `Space`
3. **Expected**: Folder toggles expansion state

### Drag & Drop Testing

#### Sibling Reordering

1. Drag a node to the **top edge** of another node
2. **Expected**: Blue line appears above target
3. Drop the node
4. **Expected**: Action logged as "before" position

#### Nesting in Folder

1. Drag a file to the **center** of a folder
2. **Expected**: Folder highlights with blue outline
3. Drop the file
4. **Expected**: Action logged as "inside" position

#### Auto-Expand Feature (Critical)

1. Find a **closed folder** with children
2. Drag any node and hover over **any part** of the closed folder (top, middle, or bottom)
3. **Expected after 500ms**: Folder automatically expands
4. Continue dragging into a nested folder
5. **Expected**: Can reach deeply nested folders in one drag operation
6. **Note**: No need to aim for the center - just hover anywhere over the folder!

#### Auto-Scroll Feature (Critical)

1. Create/load a tree with many items (use 5K or 10K dataset)
2. Collapse some folders so you have a long scrollable list
3. Drag any item and move your mouse to the **top 50px** of the viewport
4. **Expected**: Tree automatically scrolls upward smoothly
5. Move mouse to the **bottom 50px** of the viewport
6. **Expected**: Tree automatically scrolls downward smoothly
7. Move mouse away from edges
8. **Expected**: Auto-scroll stops immediately

**Use Case**: This allows dragging an item from the bottom of a large tree to a folder at the top without manual scrolling.

### Focus & Search Feature Testing

#### Search and Focus

1. Load a large dataset (5K or 10K nodes)
2. Type a search term in the "Search to focus..." input (e.g., "Module")
3. **Expected**: List of matching items appears below
4. Click on any search result
5. **Expected**:
   - Tree scrolls to that item
   - Item is focused (highlighted)
   - Item is selected
   - Search clears automatically

#### Random Focus

1. Click "🎲 Focus Random Item" button
2. **Expected**:
   - Tree scrolls to a random item
   - Item is focused and selected
   - Smooth scroll animation

#### Programmatic Focus

1. Open browser console
2. Get tree component reference
3. Call `treeRef.focusItem('folder-123')` with any node ID
4. **Expected**: Tree scrolls to that specific node and focuses it

### Expansion State Persistence

#### Test Persistence

1. Expand several folders at different levels
2. Refresh the page (`Cmd+R` or `F5`)
3. **Expected**: Same folders remain expanded after reload

#### Test Storage Key

1. Open browser DevTools → Application → Local Storage
2. Look for key: `demo_tree_expanded`
3. **Expected**: Array of expanded folder IDs stored as JSON

## 📊 Performance Metrics to Monitor

### Generation Time

- **1K nodes**: < 10ms
- **5K nodes**: < 30ms
- **10K nodes**: < 60ms
- **50K nodes**: < 250ms

### Initial Render Time

- **1K nodes**: < 20ms
- **5K nodes**: < 50ms
- **10K nodes**: < 80ms
- **50K nodes**: < 200ms

### Frame Rate (Scrolling)

- **All sizes**: Consistent 60fps (16.67ms per frame)
- Use Chrome DevTools Performance tab to verify

### Memory Usage

- **10K nodes**: ~10-15MB
- **50K nodes**: ~40-60MB
- Check with Chrome DevTools Memory profiler

## 🐛 Common Issues & Solutions

### Issue: Laggy scrolling

**Check**:

1. Open DevTools → Performance
2. Record while scrolling
3. Look for long tasks (> 50ms)

**Solutions**:

- Verify `v-memo` is working in TreeRow.vue
- Check if `shallowRef` is used for nodes
- Ensure no unnecessary re-renders in parent

### Issue: Drag & drop not working

**Check**:

1. Browser console for errors
2. Verify `draggable="true"` on rows
3. Check `event.dataTransfer` is not null

**Solutions**:

- Ensure no CSS `pointer-events: none` on tree container
- Check browser drag & drop permissions
- Verify event handlers are attached

### Issue: Auto-expand not triggering

**Check**:

1. Hover duration (must be > 500ms)
2. Mouse position (must be in center 60% of row)
3. Folder must be closed

**Solutions**:

- Increase hover time
- Position mouse more carefully
- Check `autoExpandTimer` is not being cleared prematurely

### Issue: Auto-scroll not working

**Check**:

1. Mouse position (must be within 50px of top/bottom edge)
2. Container must be scrollable (content exceeds viewport)
3. `isDragging` state is true

**Solutions**:

- Ensure you're dragging an item (not just hovering)
- Verify container has overflow auto/scroll
- Check browser console for errors

### Issue: State not persisting

**Check**:

1. DevTools → Application → Local Storage
2. Verify `demo_tree_expanded` key exists
3. Check value is valid JSON array

**Solutions**:

- Clear Local Storage and try again
- Check `storageKey` prop is set correctly
- Verify no browser extensions blocking storage

## 🔬 Advanced Testing

### Browser DevTools Performance Profiling

1. Open DevTools (`F12`)
2. Go to "Performance" tab
3. Click Record (⚫)
4. Perform actions (scroll, expand, drag)
5. Stop recording
6. Analyze:
   - **Scripting** (JS execution) should be minimal
   - **Rendering** should be fast
   - **Painting** should be contained
   - No long tasks (> 50ms)

### Vue DevTools Inspection

1. Install Vue DevTools extension
2. Open DevTools → Vue tab
3. Check component tree:
   - Only 1 FileTree instance
   - Multiple TreeRow instances (only visible ones)
4. Use Timeline to track re-renders

### Memory Leak Testing

1. DevTools → Memory tab
2. Take heap snapshot
3. Expand/collapse many folders
4. Take another snapshot
5. Compare:
   - **Expected**: Minimal growth
   - **Red flag**: Continuous growth on repeated actions

## ✅ Success Criteria

### Performance Goals

- ✅ Render 10K nodes in < 80ms
- ✅ Maintain 60fps during scroll at all sizes
- ✅ Drag & drop latency < 16ms
- ✅ Keyboard navigation latency < 10ms
- ✅ Memory usage grows linearly with node count

### Functionality Goals

- ✅ All selection modes work correctly
- ✅ Keyboard navigation follows VS Code patterns
- ✅ Drag & drop with all 3 positions work
- ✅ Auto-expand activates reliably
- ✅ State persists across sessions
- ✅ No errors in console

### UX Goals

- ✅ Interactions feel instant
- ✅ Visual feedback is clear
- ✅ No jank or stuttering
- ✅ Accessible via keyboard only

## 📝 Test Report Template

```markdown
## Test Report - [Date]

### Environment

- Browser: [Chrome 120 / Firefox 121 / etc.]
- OS: [macOS 14 / Windows 11 / etc.]
- Device: [MacBook Pro M1 / etc.]

### Performance Results

| Dataset | Gen Time | Render Time | FPS | Pass/Fail |
| ------- | -------- | ----------- | --- | --------- |
| 1K      | Xms      | Xms         | 60  | ✅/❌     |
| 5K      | Xms      | Xms         | 60  | ✅/❌     |
| 10K     | Xms      | Xms         | 60  | ✅/❌     |
| 50K     | Xms      | Xms         | 60  | ✅/❌     |

### Behavior Results

- Single Select: ✅/❌
- Multi-Select: ✅/❌
- Range Select: ✅/❌
- Keyboard Nav: ✅/❌
- Keyboard Auto-Scroll: ✅/❌
- Drag Sibling: ✅/❌
- Drag Inside: ✅/❌
- Auto-Expand: ✅/❌
- Auto-Scroll: ✅/❌
- Focus Feature: ✅/❌
- Persistence: ✅/❌

### Issues Found

1. [Description]
2. [Description]

### Notes

[Any additional observations]
```

## 🎓 Learning Resources

- **Virtualization**: [@tanstack/vue-virtual docs](https://tanstack.com/virtual/latest)
- **Vue Performance**: [Vue.js Performance Guide](https://vuejs.org/guide/best-practices/performance.html)
- **Chrome DevTools**: [Performance Profiling Guide](https://developer.chrome.com/docs/devtools/performance/)

---

Happy testing! Report any issues or suggestions. 🚀
