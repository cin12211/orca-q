import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RABBIT_DEFINITIONS_SECTIONS,
  RABBIT_INSIGHTS_SECTIONS,
  RABBIT_REFRESH_OPTIONS,
  RABBIT_TAB_ICONS,
  RABBIT_USER_GROUPS,
} from '~/components/modules/rabbitmq-workspace/constants';
import {
  getRabbitUserAppearance,
  getRabbitUserGroupId,
} from '~/components/modules/rabbitmq-workspace/utils';

const hugeicons = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'node_modules/@iconify-json/hugeicons/icons.json'),
    'utf8'
  )
) as { icons: Record<string, unknown>; aliases?: Record<string, unknown> };

const hasHugeicon = (name: string) => {
  const key = name.replace('hugeicons:', '');
  return key in hugeicons.icons || key in (hugeicons.aliases ?? {});
};

describe('getRabbitUserAppearance', () => {
  it('matches the Postgres roles tree: yellow for administrators', () => {
    expect(
      getRabbitUserAppearance({ tags: ['administrator'], hasPassword: true })
    ).toEqual({ icon: 'hugeicons:user-circle', iconClass: 'text-yellow-500' });
  });

  it('uses blue for users who can log in with a password', () => {
    expect(
      getRabbitUserAppearance({ tags: ['management'], hasPassword: true })
    ).toEqual({ icon: 'hugeicons:user-circle', iconClass: 'text-blue-400' });
  });

  it('uses a lock icon for users without a password', () => {
    expect(getRabbitUserAppearance({ tags: [], hasPassword: false })).toEqual({
      icon: 'hugeicons:user-lock-01',
      iconClass: 'text-purple-400',
    });
    expect(
      getRabbitUserAppearance({ tags: ['administrator'], hasPassword: false })
    ).toEqual({ icon: 'hugeicons:user-lock-01', iconClass: 'text-yellow-500' });
  });
});

describe('RabbitMQ user groups', () => {
  it('uses RabbitMQ tag names, most privileged first', () => {
    expect(RABBIT_USER_GROUPS.map(group => group.label).slice(0, 5)).toEqual([
      'administrator',
      'monitoring',
      'policymaker',
      'management',
      'impersonator',
    ]);
  });

  it('puts each user under its most privileged built-in tag', () => {
    expect(getRabbitUserGroupId(['management', 'administrator'])).toBe(
      'administrator'
    );
    expect(getRabbitUserGroupId(['management', 'monitoring'])).toBe(
      'monitoring'
    );
    expect(getRabbitUserGroupId(['policymaker', 'management'])).toBe(
      'policymaker'
    );
    expect(getRabbitUserGroupId(['impersonator'])).toBe('impersonator');
  });

  it('separates custom tags from users without tags', () => {
    expect(getRabbitUserGroupId(['ops-team'])).toBe('other');
    expect(getRabbitUserGroupId([])).toBe('none');
  });
});

describe('RabbitMQ user icons', () => {
  it('only uses icons that exist in Hugeicons', () => {
    const icons = [
      ...RABBIT_USER_GROUPS.map(group => group.icon),
      getRabbitUserAppearance({ tags: [], hasPassword: true }).icon,
      getRabbitUserAppearance({ tags: [], hasPassword: false }).icon,
      'hugeicons:user-add-01',
    ];

    for (const icon of icons) expect(hasHugeicon(icon), icon).toBe(true);
  });
});

describe('Management Definitions tool', () => {
  it('offers Export then Import as tabs of one tool', () => {
    expect(RABBIT_DEFINITIONS_SECTIONS.map(section => section.id)).toEqual([
      'export',
      'import',
    ]);
  });

  it('only uses icons that exist in Hugeicons', () => {
    const icons = [
      RABBIT_TAB_ICONS.definitions,
      ...RABBIT_DEFINITIONS_SECTIONS.map(section => section.icon),
    ];

    for (const icon of icons) expect(hasHugeicon(icon), icon).toBe(true);
  });
});

describe('RabbitMQ Instance Insights tabs', () => {
  it('follows the Management UI order with unique ids', () => {
    const ids = RABBIT_INSIGHTS_SECTIONS.map(section => section.id);

    expect(ids[0]).toBe('overview');
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining(['vhosts', 'policies', 'limits', 'feature-flags'])
    );
  });

  it('offers turning auto refresh off', () => {
    expect(RABBIT_REFRESH_OPTIONS[0]).toEqual({ value: 0, label: 'Off' });
  });
});
