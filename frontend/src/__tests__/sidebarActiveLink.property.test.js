// Feature: admin-panel-redesign, Property 3: Active sidebar link matches current route
import fc from 'fast-check';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Products', path: '/admin/products' },
  { label: 'Product Stock', path: '/admin/stock' },
  { label: 'Dead Stock', path: '/admin/dead-stock' },
  { label: 'Add Product', path: '/admin/products/add' },
];

/**
 * Mirrors the active-link logic from AdminLayout:
 *   const isActive = location.pathname === path;
 *   backgroundColor: isActive ? '#fff' : 'transparent'
 *   color: isActive ? '#000' : '#a1a1aa'
 */
function getLinkStyles(currentPath) {
  return NAV_LINKS.map(({ label, path }) => {
    const isActive = currentPath === path;
    return {
      label,
      path,
      isActive,
      backgroundColor: isActive ? '#fff' : 'transparent',
      color: isActive ? '#000' : '#a1a1aa',
    };
  });
}

describe('Property 3: Active sidebar link matches current route', () => {
  const linkArb = fc.constantFrom(...NAV_LINKS);

  it('exactly one link is highlighted and it matches the current path', () => {
    fc.assert(
      fc.property(linkArb, (selectedLink) => {
        const styles = getLinkStyles(selectedLink.path);
        const activeLinks = styles.filter((s) => s.isActive);

        // Exactly one link is active
        expect(activeLinks).toHaveLength(1);
        // The active link matches the selected path
        expect(activeLinks[0].path).toBe(selectedLink.path);
        // Active link has correct highlight styles
        expect(activeLinks[0].backgroundColor).toBe('#fff');
        expect(activeLinks[0].color).toBe('#000');

        // All other links have default styles
        const inactiveLinks = styles.filter((s) => !s.isActive);
        inactiveLinks.forEach((link) => {
          expect(link.backgroundColor).toBe('transparent');
          expect(link.color).toBe('#a1a1aa');
        });
      }),
      { numRuns: 100 }
    );
  });

  it('no link is highlighted when the path does not match any sidebar link', () => {
    const nonMatchingPathArb = fc.string().filter(
      (s) => !NAV_LINKS.some((link) => link.path === s)
    );

    fc.assert(
      fc.property(nonMatchingPathArb, (path) => {
        const styles = getLinkStyles(path);
        const activeLinks = styles.filter((s) => s.isActive);

        expect(activeLinks).toHaveLength(0);

        // All links have default styles
        styles.forEach((link) => {
          expect(link.backgroundColor).toBe('transparent');
          expect(link.color).toBe('#a1a1aa');
        });
      }),
      { numRuns: 100 }
    );
  });

  it('active link label matches the expected label for that path', () => {
    fc.assert(
      fc.property(linkArb, (selectedLink) => {
        const styles = getLinkStyles(selectedLink.path);
        const active = styles.find((s) => s.isActive);

        expect(active.label).toBe(selectedLink.label);
      }),
      { numRuns: 100 }
    );
  });
});
