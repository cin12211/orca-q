<script setup lang="ts">
import { Icon } from '#components';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useFileDrop } from '~/core/composables/useFileDrop';

const props = defineProps<{
  formData: {
    sslEnabled: boolean;
    sslMode: any;
    sslCA: string;
    sslCert: string;
    sslKey: string;
  };
}>();

const {
  onDragOver: caDragOver,
  onDragLeave: caDragLeave,
  onDrop: caDrop,
  isDragging: caDragging,
} = useFileDrop(content => {
  props.formData.sslCA = content;
});

const {
  onDragOver: certDragOver,
  onDragLeave: certDragLeave,
  onDrop: certDrop,
  isDragging: certDragging,
} = useFileDrop(content => {
  props.formData.sslCert = content;
});

const {
  onDragOver: keyDragOver,
  onDragLeave: keyDragLeave,
  onDrop: keyDrop,
  isDragging: keyDragging,
} = useFileDrop(content => {
  props.formData.sslKey = content;
});
</script>

<template>
  <AccordionItem value="ssl">
    <AccordionTrigger class="hover:no-underline">
      <div class="flex items-center gap-2">
        <Icon name="hugeicons:security-check" class="size-4 text-primary" />
        <span>SSL Configuration</span>
      </div>
    </AccordionTrigger>
    <AccordionContent class="space-y-4 pt-4 px-1">
      <div class="flex items-center justify-between">
        <Label for="ssl-enabled">Enable SSL</Label>
        <Switch id="ssl-enabled" v-model:model-value="formData.sslEnabled" />
      </div>

      <template v-if="formData.sslEnabled">
        <div class="space-y-2">
          <Label for="ssl-mode">SSL Mode</Label>
          <Select v-model="formData.sslMode">
            <SelectTrigger id="ssl-mode">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="disable">Disable</SelectItem>
              <SelectItem value="preferred">Preferred</SelectItem>
              <SelectItem value="require">Require</SelectItem>
              <SelectItem value="verify-ca">Verify CA</SelectItem>
              <SelectItem value="verify-full">Verify Full</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="ssl-ca">CA Certificate</Label>
            <Textarea
              id="ssl-ca"
              v-model="formData.sslCA"
              placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
              :class="[
                'min-h-[80px] max-h-[160px] text-xs font-mono',
                caDragging ? 'ring-2 ring-primary' : '',
              ]"
              @dragover="caDragOver"
              @dragleave="caDragLeave"
              @drop="caDrop"
            />
            <p class="text-xs text-muted-foreground">
              Drop a .pem / .crt file here, or paste the CA certificate content
            </p>
          </div>

          <div class="space-y-2">
            <Label for="ssl-cert">Client Certificate</Label>
            <Textarea
              id="ssl-cert"
              v-model="formData.sslCert"
              placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
              :class="[
                'min-h-[80px] max-h-[160px] text-xs font-mono',
                certDragging ? 'ring-2 ring-primary' : '',
              ]"
              @dragover="certDragOver"
              @dragleave="certDragLeave"
              @drop="certDrop"
            />
            <p class="text-xs text-muted-foreground">
              Drop a .pem / .crt file here, or paste the client certificate
              content
            </p>
          </div>

          <div class="space-y-2">
            <Label for="ssl-key">SSL Key</Label>
            <Textarea
              id="ssl-key"
              v-model="formData.sslKey"
              placeholder="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
              :class="[
                'min-h-[80px] max-h-[160px] text-xs font-mono',
                keyDragging ? 'ring-2 ring-primary' : '',
              ]"
              @dragover="keyDragOver"
              @dragleave="keyDragLeave"
              @drop="keyDrop"
            />
            <p class="text-xs text-muted-foreground">
              Drop a .pem / .key file here, or paste the private key content
            </p>
          </div>
        </div>
      </template>
    </AccordionContent>
  </AccordionItem>
</template>
