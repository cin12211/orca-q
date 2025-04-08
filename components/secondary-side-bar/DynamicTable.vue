<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-vue-next";
import { computed, ref, watch } from "vue";

type SortDirection = "asc" | "desc" | null;

// Define props
const props = defineProps<{
  data?: Record<string, any>[];
  caption?: string;
}>();

// Make tableData reactive to prop changes using computed
const tableData = computed(() => props.data || []);
const tableCaption = computed(() => props.caption || "Dynamic Data Table");

// Search state
const searchQuery = ref("");

// Sorting state
const sortConfig = ref<{
  key: string | null;
  direction: SortDirection;
}>({
  key: null,
  direction: null,
});

// Pagination state
const currentPage = ref(1);
const pageSize = ref(10);

// Reset pagination and sorting when data changes
watch(
  () => props.data,
  () => {
    currentPage.value = 1;
    sortConfig.value = { key: null, direction: null };
  },
  { deep: true }
);

// Reset pagination when search query changes
watch(searchQuery, () => {
  currentPage.value = 1;
});

// Extract column names from the first object's keys
const columnNames = computed(() => {
  if (tableData.value.length === 0) return [];
  return Object.keys(tableData.value[0]);
});

// Filter data based on search query
const filteredData = computed(() => {
  if (!searchQuery.value.trim()) {
    return tableData.value;
  }

  const query = searchQuery.value.toLowerCase().trim();

  return tableData.value.filter((row) => {
    // Check if any field in the row contains the search query
    return Object.values(row).some((value) => {
      // Convert the value to a string for comparison
      const stringValue = formatCellValue(value).toLowerCase();
      return stringValue.includes(query);
    });
  });
});

// Sort the filtered data
const sortedData = computed(() => {
  const shouldSort = sortConfig.value.key && sortConfig.value.direction;

  if (!shouldSort) {
    return filteredData.value;
  }

  return [...filteredData.value].sort((a, b) => {
    const aValue = a[sortConfig.value.key!];
    const bValue = b[sortConfig.value.key!];

    // Handle different data types
    if (aValue === null) return sortConfig.value.direction === "asc" ? -1 : 1;
    if (bValue === null) return sortConfig.value.direction === "asc" ? 1 : -1;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortConfig.value.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.value.direction === "asc"
      ? aValue > bValue
        ? 1
        : -1
      : aValue < bValue
      ? 1
      : -1;
  });
});

// Pagination logic
const totalPages = computed(() =>
  Math.ceil(sortedData.value.length / pageSize.value)
);
const paginatedData = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value;
  return sortedData.value.slice(startIndex, startIndex + pageSize.value);
});

// Handle sorting
const requestSort = (key: string) => {
  let direction: SortDirection = "asc";

  if (sortConfig.value.key === key) {
    if (sortConfig.value.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.value.direction === "desc") {
      direction = null;
    }
  }

  sortConfig.value = { key, direction };
};

// Get sort icon
const getSortIcon = (key: string) => {
  if (sortConfig.value.key !== key) {
    return ArrowUpDown;
  }

  if (sortConfig.value.direction === "asc") {
    return ArrowUp;
  }

  if (sortConfig.value.direction === "desc") {
    return ArrowDown;
  }

  return ArrowUpDown;
};

// Pagination controls
const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value));
};

// Helper function to format cell values
const formatCellValue = (value: any): string => {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

// Handle page size change
const handlePageSizeChange = (value: string) => {
  pageSize.value = Number(value);
  currentPage.value = 1; // Reset to first page when changing page size
};

// Clear search
const clearSearch = () => {
  searchQuery.value = "";
};
</script>

<template>
  <div class="p-2">
    <div v-if="tableData.length === 0" class="space-y-4">
      <div class="p-8 text-center border rounded-lg">
        <p class="text-muted-foreground">No data available</p>
      </div>
    </div>
    <div v-else class="space-y-2">
      <!-- Search Input -->

      <div class="flex items-center gap-2">
        <div class="relative w-full">
          <Search
            class="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground"
          />
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search in all fields..."
            class="pl-8 w-full h-8"
          />
        </div>

        <Button
          :variant="searchQuery ? 'default' : 'secondary'"
          @click="clearSearch"
          size="sm"
        >
          Clear
        </Button>
      </div>

      <!-- Search Results Summary -->
      <!-- <div v-if="searchQuery" class="text-sm">
      Found {{ filteredData.length }} results for "{{ searchQuery }}"
    </div> -->
      <div class="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                v-for="column in columnNames"
                :key="column"
                class="h-8"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  @click="requestSort(column)"
                  class="flex items-center font-medium"
                >
                  {{ column }}
                  <component :is="getSortIcon(column)" class="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(row, rowIndex) in paginatedData"
              :key="rowIndex"
              :class="{ 'bg-muted/50': rowIndex % 2 === 0 }"
            >
              <TableCell
                v-for="column in columnNames"
                :key="`${rowIndex}-${column}`"
                class="p-1"
              >
                {{ formatCellValue(row[column]) }}
              </TableCell>
            </TableRow>

            <!-- No Results Message -->
            <TableRow v-if="filteredData.length === 0">
              <TableCell :colspan="columnNames.length" class="h-24 text-center">
                No results found for "{{ searchQuery }}"
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination Controls -->
      <div class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          Showing
          {{
            sortedData.length
              ? Math.min(sortedData.length, (currentPage - 1) * pageSize + 1)
              : 0
          }}
          to {{ Math.min(sortedData.length, currentPage * pageSize) }} of
          {{ sortedData.length }} entries
        </div>
        <div class="flex items-center space-x-6">
          <div class="flex items-center space-x-2">
            <p class="text-sm font-medium">Rows per page</p>
            <Select
              :model-value="String(pageSize)"
              @update:model-value="handlePageSizeChange"
            >
              <SelectTrigger class="h-6! w-[70px]">
                <SelectValue :placeholder="pageSize.toString()" />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem
                  v-for="size in [5, 10, 20, 50]"
                  :key="size"
                  :value="String(size)"
                >
                  {{ size }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center space-x-2">
            <Button
              variant="outline"
              size="iconSm"
              @click="goToPage(1)"
              :disabled="currentPage === 1 || sortedData.length === 0"
            >
              <span class="sr-only">Go to first page</span>
              <ChevronsLeft class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="iconSm"
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1 || sortedData.length === 0"
            >
              <span class="sr-only">Go to previous page</span>
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <span class="text-sm font-medium">
              Page {{ sortedData.length ? currentPage : 0 }} of
              {{ totalPages || 1 }}
            </span>
            <Button
              variant="outline"
              size="iconSm"
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages || sortedData.length === 0"
            >
              <span class="sr-only">Go to next page</span>
              <ChevronRight class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="iconSm"
              @click="goToPage(totalPages)"
              :disabled="currentPage === totalPages || sortedData.length === 0"
            >
              <span class="sr-only">Go to last page</span>
              <ChevronsRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
