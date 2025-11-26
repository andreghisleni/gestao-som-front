import { useLocation, useNavigate, useParams } from '@tanstack/react-router';
import { CheckIcon, ChevronDownIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { updateUserLastEventId, useGetAllEvents } from '@/http/generated';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { EventFormDialog } from './event-form-dialog';
import EventSelectScreen from './event-select-screen';

export function EventSelect() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<boolean>(false);

  const { data, isLoading } = useGetAllEvents();

  const location = useLocation();
  const { eventId: currentEventId } = useParams({
    strict: false,
  });

  const withoutEventRoute = location.pathname.startsWith('/sessions');

  async function handleSelect(newEventId?: string) {
    // Não faz nada se o novo ID não existir ou for o mesmo que o atual
    if (!newEventId || newEventId === currentEventId) {
      return;
    }

    await updateUserLastEventId(newEventId);

    if (currentEventId) {
      // Constrói o novo caminho substituindo o ID antigo pelo novo na URL atual
      const newPath = location.pathname.replace(currentEventId, newEventId);
      // Navega para a nova rota mantendo o restante da URL
      await navigate({ to: newPath });
    } else {
      // Caso seja a primeira seleção (sem eventId na URL), vai para o dashboard
      await navigate({
        to: '/$eventId/dashboard',
        params: { eventId: newEventId },
      });
    }
  }

  return (
    <>
      {!(currentEventId || withoutEventRoute) && <EventSelectScreen />}
      <div className="*:not-first:mt-2">
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <Button
              aria-expanded={open}
              className="w-full justify-between border-input bg-background px-3 font-normal outline-none outline-offset-0 hover:bg-background focus-visible:outline-[3px]"
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <Skeleton className="h-[20px] w-[100px] rounded-full" />
              ) : (
                <span
                  className={cn(
                    'truncate',
                    !currentEventId && 'text-muted-foreground'
                  )}
                >
                  {currentEventId
                    ? data?.find((event) => event.id === currentEventId)?.name
                    : 'Select an event'}
                </span>
              )}
              {isLoading ? (
                <Loader2
                  className="animate-spin text-muted-foreground/80"
                  size={16}
                />
              ) : (
                <ChevronDownIcon
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground/80"
                  size={16}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0"
          >
            <Command>
              <CommandInput placeholder="Find organization" />
              <CommandList>
                <CommandEmpty>No event found.</CommandEmpty>
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
                      {currentEventId === event.id && (
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
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
