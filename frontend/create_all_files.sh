#!/bin/bash
cd /home/alignminds/Desktop/Akhil/Sourav/Emergent/frontend/src

# Create placeholder pages
for page in HomePage ProductListPage ProductDetailPage CartPage CheckoutPage OrdersPage WishlistPage AdminPage; do
  cat > pages/${page}.js << ENDPAGE
import React from 'react';

const ${page} = () => {
  return (
    <div className="page-transition min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="heading-font text-4xl md:text-6xl font-bold tracking-tight mb-4">
          ${page}
        </h1>
        <p className="mono-font text-zinc-500">Coming soon...</p>
      </div>
    </div>
  );
};

export default ${page};
ENDPAGE
done

# Create placeholder components
for comp in AuthModal CartDrawer ProductViewer3D Product360Viewer ProductCard; do
  cat > components/${comp}.js << ENDCOMP
import React from 'react';

const ${comp} = ({ children }) => {
  return <div>{children}</div>;
};

export default ${comp};
ENDCOMP
done

echo "All files created!"
