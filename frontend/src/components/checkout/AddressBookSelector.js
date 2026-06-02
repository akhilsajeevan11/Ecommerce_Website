import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MapPin, Plus } from 'lucide-react';

/**
 * AddressBookSelector — UI to select a saved address or add a new one.
 *
 * @param {object} props
 * @param {Array} props.addresses - list of saved addresses
 * @param {object} props.selectedAddress - currently selected address object
 * @param {(address: object) => void} props.onSelect - callback when an address is selected
 * @param {object} props.newAddressForm - state for the new address form
 * @param {(field: string, value: string) => void} props.onNewAddressChange - form change handler
 * @param {object} props.formErrors - validation errors for the new address form
 * @returns {JSX.Element}
 *
 * Source spec:
 *   Requirement 11.3 — list saved addresses + "Add new" expanding inline form
 */
const AddressBookSelector = ({
  addresses = [],
  selectedAddress,
  onSelect,
  newAddressForm,
  onNewAddressChange,
  formErrors = {}
}) => {
  const [isAddingNew, setIsAddingNew] = useState(addresses.length === 0);

  const handleSelectExisting = (address) => {
    setIsAddingNew(false);
    onSelect(address);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    onSelect(null); // Clear selection to enforce new address flow
  };

  return (
    <div className="space-y-6" data-testid="address-book-selector">
      {/* Saved Addresses List */}
      {addresses.length > 0 && (
        <div className="space-y-3">
          <Label className="font-mono text-xs tracking-wider uppercase text-muted-foreground">
            Saved Addresses
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.map((addr) => {
              const isSelected = !isAddingNew && selectedAddress?.id === addr.id;
              return (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => handleSelectExisting(addr)}
                  className={`
                    flex flex-col text-left p-4 border transition-all duration-200
                    ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}
                  `}
                  aria-pressed={isSelected}
                  data-testid={`address-card-${addr.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-body font-medium text-sm">{addr.name}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground mt-1 line-clamp-2">
                    {addr.address}, {addr.city}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {addr.state} - {addr.postalCode}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Toggle Button */}
      {addresses.length > 0 && !isAddingNew && (
        <Button
          type="button"
          variant="outline"
          onClick={handleAddNew}
          className="w-full sm:w-auto font-mono text-xs tracking-wider uppercase"
          data-testid="add-new-address-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Address
        </Button>
      )}

      {/* Inline New Address Form */}
      {isAddingNew && (
        <div className="space-y-4 pt-4 border-t border-border mt-4 animate-in fade-in slide-in-from-top-2">
          {addresses.length > 0 && (
            <h3 className="font-mono text-xs tracking-wider uppercase text-muted-foreground mb-4">
              New Address
            </h3>
          )}
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="address-name" className="font-mono text-[10px] tracking-wider uppercase mb-1.5 block">
                Full Name *
              </Label>
              <Input
                id="address-name"
                value={newAddressForm.name}
                onChange={(e) => onNewAddressChange('name', e.target.value)}
                className={`rounded-none ${formErrors.name ? 'border-destructive' : ''}`}
                placeholder="John Doe"
                aria-invalid={formErrors.name ? 'true' : 'false'}
                aria-describedby={formErrors.name ? 'name-error' : undefined}
                data-testid="checkout-name"
              />
              {formErrors.name && (
                <p id="name-error" className="font-mono text-[10px] text-destructive mt-1 tracking-wide" role="alert">
                  {formErrors.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="address-street" className="font-mono text-[10px] tracking-wider uppercase mb-1.5 block">
                Address *
              </Label>
              <Input
                id="address-street"
                value={newAddressForm.address}
                onChange={(e) => onNewAddressChange('address', e.target.value)}
                className={`rounded-none ${formErrors.address ? 'border-destructive' : ''}`}
                placeholder="123 Main Street, Apt 4B"
                aria-invalid={formErrors.address ? 'true' : 'false'}
                aria-describedby={formErrors.address ? 'address-error' : undefined}
                data-testid="checkout-address"
              />
              {formErrors.address && (
                <p id="address-error" className="font-mono text-[10px] text-destructive mt-1 tracking-wide" role="alert">
                  {formErrors.address}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address-city" className="font-mono text-[10px] tracking-wider uppercase mb-1.5 block">
                  City *
                </Label>
                <Input
                  id="address-city"
                  value={newAddressForm.city}
                  onChange={(e) => onNewAddressChange('city', e.target.value)}
                  className={`rounded-none ${formErrors.city ? 'border-destructive' : ''}`}
                  placeholder="Mumbai"
                  aria-invalid={formErrors.city ? 'true' : 'false'}
                  aria-describedby={formErrors.city ? 'city-error' : undefined}
                  data-testid="checkout-city"
                />
                {formErrors.city && (
                  <p id="city-error" className="font-mono text-[10px] text-destructive mt-1 tracking-wide" role="alert">
                    {formErrors.city}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="address-state" className="font-mono text-[10px] tracking-wider uppercase mb-1.5 block">
                  State *
                </Label>
                <Input
                  id="address-state"
                  value={newAddressForm.state}
                  onChange={(e) => onNewAddressChange('state', e.target.value)}
                  className={`rounded-none ${formErrors.state ? 'border-destructive' : ''}`}
                  placeholder="Maharashtra"
                  aria-invalid={formErrors.state ? 'true' : 'false'}
                  aria-describedby={formErrors.state ? 'state-error' : undefined}
                  data-testid="checkout-state"
                />
                {formErrors.state && (
                  <p id="state-error" className="font-mono text-[10px] text-destructive mt-1 tracking-wide" role="alert">
                    {formErrors.state}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address-postal" className="font-mono text-[10px] tracking-wider uppercase mb-1.5 block">
                  Postal Code *
                </Label>
                <Input
                  id="address-postal"
                  value={newAddressForm.postalCode}
                  onChange={(e) => onNewAddressChange('postalCode', e.target.value)}
                  className={`rounded-none ${formErrors.postalCode ? 'border-destructive' : ''}`}
                  placeholder="400001"
                  maxLength={6}
                  aria-invalid={formErrors.postalCode ? 'true' : 'false'}
                  aria-describedby={formErrors.postalCode ? 'postal-error' : undefined}
                  data-testid="checkout-postal"
                />
                {formErrors.postalCode && (
                  <p id="postal-error" className="font-mono text-[10px] text-destructive mt-1 tracking-wide" role="alert">
                    {formErrors.postalCode}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="address-phone" className="font-mono text-[10px] tracking-wider uppercase mb-1.5 block">
                  Phone *
                </Label>
                <Input
                  id="address-phone"
                  value={newAddressForm.phone}
                  onChange={(e) => onNewAddressChange('phone', e.target.value)}
                  className={`rounded-none ${formErrors.phone ? 'border-destructive' : ''}`}
                  placeholder="9876543210"
                  maxLength={10}
                  aria-invalid={formErrors.phone ? 'true' : 'false'}
                  aria-describedby={formErrors.phone ? 'phone-error' : undefined}
                  data-testid="checkout-phone"
                />
                {formErrors.phone && (
                  <p id="phone-error" className="font-mono text-[10px] text-destructive mt-1 tracking-wide" role="alert">
                    {formErrors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressBookSelector;
