import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, PlusIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import z from 'zod';
import { getAllEventsQueryKey, useCreateEvent } from '@/http/generated';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  ticketType: z.enum(['SINGLE_NUMERATION', 'MULTIPLE_NUMERATIONS']),
  ticketRanges: z
    .array(
      z
        .object({
          start: z.coerce.number().int().min(1, 'Start must be at least 1'),
          end: z.coerce.number().int().min(1, 'End must be at least 1'),
          type: z.string().min(1, 'Type is required'),
          cost: z.coerce.number().min(0),
        })
        .refine((v) => v.end >= v.start, {
          path: ['end'],
          message: 'End must be greater than or equal to start',
        })
    )
    .nonempty('At least one ticket range is required'),
  // novos campos
  autoGenerateTicketsTotalPerMember: z.coerce.number().int().min(0).optional(),
  readOnly: z.boolean().optional(),
});

export type EventFormData = z.infer<typeof formSchema>;

export function EventFormDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<EventFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: 'Feijoada 2025',
      description: '',
      ticketType: 'SINGLE_NUMERATION',
      ticketRanges: [
        {
          start: 1,
          end: 1000,
          type: 'General',
          cost: 50,
        },
      ],
      // valores padrão para os novos campos
      autoGenerateTicketsTotalPerMember: undefined,
      readOnly: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ticketRanges',
  });

  const ticketType = form.watch('ticketType');

  // Se mudar para SINGLE, garante apenas um intervalo e remove botões
  useEffect(() => {
    if (ticketType === 'SINGLE_NUMERATION' && fields.length > 1) {
      for (let i = fields.length - 1; i > 0; i--) {
        remove(i);
      }
    }
  }, [ticketType, fields.length, remove]);

  const { mutate: postEvent } = useCreateEvent({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getAllEventsQueryKey(),
        });
        toast.success('Event created successfully');
        setIsOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast.error(`Error creating event: ${error.message}`);
      },
    },
  });

  async function onSubmit(data: EventFormData) {
    await postEvent({
      data: {
        name: data.name,
        description: data.description || null,
        ticketType: data.ticketType,
        ticketRanges: data.ticketRanges,
        // envia os novos campos (se undefined, envia como undefined - ajuste se backend exigir null)
        autoGenerateTicketsTotalPerMember:
          data.autoGenerateTicketsTotalPerMember ?? undefined,
        readOnly: data.readOnly ?? undefined,
      },
    });
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start font-normal" variant="ghost">
          <PlusIcon aria-hidden="true" className="-ms-2 opacity-60" size={16} />
          New Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Event Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Event Description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* novo campo: autoGenerateTicketsTotalPerMember */}
            <FormField
              control={form.control}
              name="autoGenerateTicketsTotalPerMember"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auto Generate Total per Member</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      min={0}
                      onChange={(e) => {
                        const v = e.target.value;
                        // permite vazio para optional
                        if (v === '') {
                          field.onChange(undefined);
                        } else {
                          field.onChange(Number(v));
                        }
                      }}
                      placeholder="Ex: 2"
                      type="number"
                      value={
                        field.value === undefined || field.value === null
                          ? ''
                          : String(field.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* novo campo: readOnly */}
            <FormField
              control={form.control}
              name="readOnly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <FormLabel className="m-0">Read Only</FormLabel>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={(val) => field.onChange(!!val)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ticketType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Type</FormLabel>
                  <FormControl>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Ticket Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE_NUMERATION">
                          Single Numeration
                        </SelectItem>
                        <SelectItem value="MULTIPLE_NUMERATIONS">
                          Multi Numeration
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ticket Ranges Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Ticket Ranges</h3>
                {ticketType === 'MULTIPLE_NUMERATIONS' && (
                  <Button
                    onClick={() => append({ start: 1, end: 100, type: '', cost: 50 })}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <PlusIcon className="mr-2" size={16} />
                    Add Range
                  </Button>
                )}
              </div>

              {fields.map((f, index) => (
                <Card key={f.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-medium">Range {index + 1}</h4>
                      {ticketType === 'MULTIPLE_NUMERATIONS' && index > 0 && (
                        <Button
                          className="text-red-600 hover:text-red-700"
                          onClick={() => remove(index)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <FormField
                        control={form.control}
                        name={`ticketRanges.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: General, VIP..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`ticketRanges.${index}.start`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start</FormLabel>
                            <FormControl>
                              <Input min={1} type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`ticketRanges.${index}.end`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End</FormLabel>
                            <FormControl>
                              <Input min={1} type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`ticketRanges.${index}.cost`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custo</FormLabel>
                            <FormControl>
                              <Input min={0} type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                'Cadastrar'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
