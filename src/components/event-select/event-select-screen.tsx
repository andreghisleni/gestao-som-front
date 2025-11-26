'use client';

import { useNavigate, useParams } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { updateUserLastEventId, useGetAllEvents } from '@/http/generated';
import { EventFormDialog } from './event-form-dialog';

export default function EventSelectScreen() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<boolean>(true);

  const { data, isLoading } = useGetAllEvents();

  const value = useParams({
    strict: false,
  }).eventId as string | undefined;

  async function handleSelect(v?: string) {
    if (!v) {
      return;
    }

    await updateUserLastEventId(v);

    await navigate({ to: '/$eventId/dashboard', params: { eventId: v } });
  }

  return (
    <CommandDialog open={open}>
      <CommandInput placeholder="Find organization" />
      <CommandList>
        <CommandEmpty>
          {isLoading ? 'Loading...' : 'No event found.'}
        </CommandEmpty>
        <CommandGroup>
          {data?.map((event) => (
            <CommandItem
              key={event.id}
              onSelect={(currentValue) => {
                handleSelect(currentValue);
                setOpen(false);
              }}
              value={event.id}
            >
              {event.name}
              {value === event.id && (
                <CheckIcon className="ml-auto" size={16} />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <EventFormDialog />
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
