import { useState } from 'react';
import { Party, Buyer } from '../../types/invoice';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Pencil, Check, X } from 'lucide-react';
import { BuyerAutocomplete } from './BuyerAutocomplete';

interface PartyCardProps {
  party: Party;
  title: string;
  onUpdate: (party: Party) => void;
  ublPath: string;
  defaultParty?: Partial<Party>;
  suggestions?: Buyer[];
}

export function PartyCard({ party, title, onUpdate, ublPath, defaultParty, suggestions }: PartyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedParty, setEditedParty] = useState<Party>(party);

  const handleSave = () => {
    onUpdate(editedParty);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedParty(party);
    setIsEditing(false);
  };

  const handleChange = (field: keyof Party | string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1] as keyof Party['address'];
      setEditedParty({
        ...editedParty,
        address: {
          ...editedParty.address,
          [addressField]: value,
        },
      });
    } else {
      setEditedParty({
        ...editedParty,
        [field]: value,
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3>{title}</h3>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            aria-label={`Edit ${title}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSave} aria-label="Save changes">
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} aria-label="Cancel editing">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor={`${title}-name`}>Name *</Label>
            {suggestions ? (
              <BuyerAutocomplete
                value={editedParty.name}
                suggestions={suggestions}
                onChange={(val) => handleChange('name', val)}
                onSelect={(selectedBuyer) => {
                  setEditedParty({
                    ...editedParty,
                    name: selectedBuyer.name,
                    vatId: selectedBuyer.vatId || '',
                    legalOrganizationId: selectedBuyer.legalOrganizationId || '',
                    address: selectedBuyer.address,
                    contactEmail: selectedBuyer.contactEmail || '',
                    contactPhone: selectedBuyer.contactPhone || '',
                  });
                }}
                placeholder="Company name"
              />
            ) : (
              <Input
                id={`${title}-name`}
                value={editedParty.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Company name"
                className="mt-1"
              />
            )}
          </div>

          {defaultParty && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedParty({
                    ...editedParty,
                    ...defaultParty,
                    address: {
                      ...editedParty.address,
                      ...(defaultParty.address || {}),
                    }
                  });
                }}
              >
                Use Default
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${title}-vatId`}>VAT ID</Label>
              <Input
                id={`${title}-vatId`}
                value={editedParty.vatId || ''}
                onChange={(e) => handleChange('vatId', e.target.value)}
                placeholder="e.g., DE123456789"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`${title}-legalOrgId`}>Legal Org ID</Label>
              <Input
                id={`${title}-legalOrgId`}
                value={editedParty.legalOrganizationId || ''}
                onChange={(e) => handleChange('legalOrganizationId', e.target.value)}
                placeholder="e.g., HRB 12345"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`${title}-street`}>Street Address</Label>
            <Input
              id={`${title}-street`}
              value={editedParty.address.street}
              onChange={(e) => handleChange('address.street', e.target.value)}
              placeholder="Street and number"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor={`${title}-postalCode`}>Postal Code</Label>
              <Input
                id={`${title}-postalCode`}
                value={editedParty.address.postalCode}
                onChange={(e) => handleChange('address.postalCode', e.target.value)}
                placeholder="12345"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor={`${title}-city`}>City</Label>
              <Input
                id={`${title}-city`}
                value={editedParty.address.city}
                onChange={(e) => handleChange('address.city', e.target.value)}
                placeholder="City"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`${title}-country`}>Country Code *</Label>
            <Input
              id={`${title}-country`}
              value={editedParty.address.country}
              onChange={(e) => handleChange('address.country', e.target.value.toUpperCase())}
              placeholder="DE"
              maxLength={2}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${title}-email`}>Email</Label>
              <Input
                id={`${title}-email`}
                type="email"
                value={editedParty.contactEmail || ''}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                placeholder="contact@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`${title}-phone`}>Phone</Label>
              <Input
                id={`${title}-phone`}
                type="tel"
                value={editedParty.contactPhone || ''}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
                placeholder="+49 30 12345678"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p>{party.name}</p>
            {party.vatId && (
              <p className="text-sm text-muted-foreground">VAT: {party.vatId}</p>
            )}
            {party.legalOrganizationId && (
              <p className="text-sm text-muted-foreground">Legal ID: {party.legalOrganizationId}</p>
            )}
          </div>
          <div className="text-sm">
            <p>{party.address.street}</p>
            <p>
              {party.address.postalCode} {party.address.city}
            </p>
            <p>{party.address.country}</p>
          </div>
          {(party.contactEmail || party.contactPhone) && (
            <div className="text-sm text-muted-foreground">
              {party.contactEmail && <p>{party.contactEmail}</p>}
              {party.contactPhone && <p>{party.contactPhone}</p>}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
        <p>
          <strong>UBL Path:</strong> {ublPath}
        </p>
      </div>
    </Card>
  );
}
