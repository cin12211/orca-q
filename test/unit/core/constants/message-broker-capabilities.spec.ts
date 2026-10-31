import { describe, expect, it } from 'vitest';
import {
  getConnectionCapabilityProfile,
  resolveConnectionFamily,
} from '~/core/constants/connection-capabilities';
import {
  DatabaseClientType,
  isMessageBrokerClientType,
} from '~/core/constants/database-client-type';
import {
  EConnectionFamily,
  EConnectionMethod,
} from '~/core/types/entities/connection.entity';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

describe('message broker capabilities', () => {
  it.each([
    [DatabaseClientType.RABBITMQ, EConnectionFamily.RABBITMQ],
    [DatabaseClientType.KAFKA, EConnectionFamily.KAFKA],
  ])('resolves %s to its own family, not Redis', (type, family) => {
    expect(
      resolveConnectionFamily({ type, method: EConnectionMethod.FORM })
    ).toBe(family);
  });

  it('hides SQL-only surfaces for brokers', () => {
    const profile = getConnectionCapabilityProfile({
      type: DatabaseClientType.KAFKA,
      method: EConnectionMethod.FORM,
    });

    expect(profile.visibleActivityItems).toEqual(['Schemas', 'DatabaseTools']);
    expect(profile.supportsRawSql).toBe(false);
    expect(profile.supportsErd).toBe(false);
    expect(profile.supportsUsersRoles).toBe(false);
    expect(profile.allowedTabTypes).toContain(TabViewType.KafkaTopicDetail);
    expect(profile.allowedTabTypes).not.toContain(TabViewType.CodeQuery);
  });

  it('exposes RabbitMQ tab types', () => {
    const profile = getConnectionCapabilityProfile({
      type: DatabaseClientType.RABBITMQ,
      method: EConnectionMethod.FORM,
    });

    expect(profile.allowedTabTypes).toEqual(
      expect.arrayContaining([
        TabViewType.InstanceInsights,
        TabViewType.RabbitQueueDetail,
        TabViewType.RabbitExchangeDetail,
      ])
    );
  });

  it('flags broker client types', () => {
    expect(isMessageBrokerClientType(DatabaseClientType.RABBITMQ)).toBe(true);
    expect(isMessageBrokerClientType(DatabaseClientType.REDIS)).toBe(false);
  });

  it('shows Users & Roles for RabbitMQ only', () => {
    const rabbit = getConnectionCapabilityProfile({
      type: DatabaseClientType.RABBITMQ,
      method: EConnectionMethod.FORM,
    });
    const kafka = getConnectionCapabilityProfile({
      type: DatabaseClientType.KAFKA,
      method: EConnectionMethod.FORM,
    });

    expect(rabbit.visibleActivityItems).toContain('UsersRoles');
    expect(rabbit.allowedTabTypes).toContain(TabViewType.RabbitUserDetail);
    expect(kafka.visibleActivityItems).not.toContain('UsersRoles');
  });
});
