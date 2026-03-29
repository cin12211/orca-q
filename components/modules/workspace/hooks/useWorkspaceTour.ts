import { useStorage } from '@vueuse/core';
import { onMounted, type Ref, watch } from 'vue';
import dayjs from 'dayjs';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useChangelogModal } from '~/core/contexts/useChangelogModal';
import { uuidv4 } from '~/core/helpers';
import { getPlatformStorage } from '~/core/persist/storage-adapter';
import { DEFAULT_WORKSPACE_ICON } from '../constants';

export function useWorkspaceTour({
  isOpenCreateWSModal,
  isOpenSelectConnectionModal,
  workspaceId,
  workspaceStore,
  onSelectWorkspace,
}: {
  isOpenCreateWSModal: Ref<boolean>;
  isOpenSelectConnectionModal: Ref<boolean>;
  workspaceId: Ref<string>;
  workspaceStore: any;
  onSelectWorkspace: (id: string) => void;
}) {
  const hasSeenTour = useStorage(
    'orcaq-has-seen-tour',
    false,
    getPlatformStorage()
  );

  const startTour = () => {
    hasSeenTour.value = true;
    const btnId = document.getElementById('tour-new-workspace-btn')
      ? '#tour-new-workspace-btn'
      : '#tour-new-workspace-btn-empty';

    const getTourOpenWorkspace = () => {
      return document.getElementById(
        `tour-open-workspace-${workspaceId.value}`
      );
    };

    const driverObj = driver({
      popoverClass: 'driver-theme-system',
      showProgress: true,
      allowClose: true, // This allows the exit 'X' button
      steps: [
        {
          popover: {
            title: 'Welcome to OrcaQ!',
            description:
              'Let us take a quick tour to get you familiar with the app.',
          },
        },
        {
          element: '#tour-workspace-area',
          popover: {
            title: 'Workspaces',
            description: 'This is where you manage your workspaces.',
          },
        },
        {
          element: btnId,
          popover: {
            title: 'Create Workspace',
            description: 'Click here to create a new workspace.',
            onNextClick: () => {
              isOpenCreateWSModal.value = true;
              setTimeout(() => driverObj.moveNext(), 500);
            },
          },
        },
        {
          element: '#tour-workspace-icon',
          popover: {
            title: 'Workspace Icon',
            description: 'Choose an icon to identify your workspace.',
          },
        },
        {
          element: '#tour-workspace-name',
          popover: {
            title: 'Workspace Name',
            description: 'Enter a unique name for your workspace.',
          },
        },
        {
          element: '#tour-workspace-desc',
          popover: {
            title: 'Workspace Description',
            description: 'Provide a brief description.',
          },
        },
        {
          element: '#tour-workspace-create',
          popover: {
            title: 'Save Workspace',
            description: 'After filling out the form, click here to create it.',
            onNextClick: () => {
              // Create the workspace automatically for the user
              const newId = uuidv4();
              workspaceStore.createWorkspace({
                desc: 'My first workspace created from tour',
                id: newId,
                name: 'My Tour Workspace',
                icon: DEFAULT_WORKSPACE_ICON,
                createdAt: dayjs().toISOString(),
              });

              isOpenCreateWSModal.value = false;
              workspaceId.value = newId;

              setTimeout(() => {
                driverObj.moveNext();
              }, 600);
            },
          },
        },
        {
          // Use a function for element to evaluate it dynamically when the step starts
          element: getTourOpenWorkspace() || '#tour-workspace-area',
          popover: {
            title: 'New Workspace Card',
            description:
              'Your new workspace appears here. Click "Open workspace" to manage its connections.',
            onNextClick: () => {
              const openBtn = document.getElementById(
                `tour-open-workspace-${workspaceId.value}`
              );
              if (openBtn) {
                openBtn.click();
              } else {
                // Fallback action if button not found
                onSelectWorkspace(workspaceId.value);
                isOpenSelectConnectionModal.value = true;
              }

              setTimeout(() => {
                driverObj.moveNext();
              }, 800);
            },
          },
        },
        {
          element: '#tour-add-connection-btn',
          popover: {
            title: 'Add Connection',
            description:
              'Inside a workspace, you can manage and add database connections.',
            onNextClick: () => {
              document.getElementById('tour-add-connection-btn')?.click();
              setTimeout(() => driverObj.moveNext(), 600);
            },
          },
        },
        {
          element: '#tour-database-type-cards',
          popover: {
            title: 'Select Database',
            description:
              'First, choose the database engine you want to connect to.',
          },
        },
        {
          element: '#tour-database-type-next',
          popover: {
            title: 'Next Step',
            description: 'Click Next after selecting your database engine.',
            onNextClick: () => {
              const firstCard = document.querySelector(
                '#tour-database-type-cards > div'
              );
              if (firstCard) {
                (firstCard as HTMLElement).click();
                setTimeout(() => {
                  document.getElementById('tour-database-type-next')?.click();
                  setTimeout(() => driverObj.moveNext(), 600);
                }, 100);
              } else {
                driverObj.moveNext();
              }
            },
          },
        },
        {
          element: '#tour-connection-method-tabs',
          popover: {
            title: 'Connection Method',
            description:
              'You can choose between connection string or form based setup.',
          },
        },
        {
          element: '#tour-connection-string-tab',
          popover: {
            title: 'Connection String Method',
            description: 'Click here to use the connection string option.',
            onNextClick: () => {
              document.getElementById('tour-connection-string-tab')?.click();
              setTimeout(() => driverObj.moveNext(), 300);
            },
          },
        },
        {
          element: '#connection-string',
          popover: {
            title: 'Enter URI',
            description: 'Paste your database URI here for quick access.',
          },
        },
        {
          element: '#tour-connection-form-tab',
          popover: {
            title: 'Connection Form Method',
            description:
              'Or click here to manually enter host, port, username, and password.',
            onNextClick: () => {
              document.getElementById('tour-connection-form-tab')?.click();
              setTimeout(() => driverObj.moveNext(), 300);
            },
          },
        },
        {
          element: '#tour-create-update-connection-btn',
          popover: {
            title: 'Create Connection',
            description:
              'After filling out the connection details, click here to save it.',
          },
        },
        {
          popover: {
            title: 'Tour Completed!',
            description: 'You are now ready to use OrcaQ! Happy querying.',
            onNextClick: () => {
              driverObj.destroy();
            },
          },
        },
      ],
      onDestroyStarted: () => {
        isOpenCreateWSModal.value = false;
        isOpenSelectConnectionModal.value = false;

        // Find any close buttons in dialogs and click them to ensure modals are closed
        const dialogs = document.querySelectorAll('[role="dialog"]');
        dialogs.forEach(d => {
          const closeBtn = d.querySelector(
            'button[aria-label="Close"]'
          ) as HTMLElement;
          if (closeBtn) closeBtn.click();
        });

        // As a fallback, fire Escape
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        driverObj.destroy();
      },
    });

    driverObj.drive();
  };

  return { startTour };
}
