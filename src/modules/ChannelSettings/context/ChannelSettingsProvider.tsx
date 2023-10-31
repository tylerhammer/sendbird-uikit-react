import React, {
  useEffect,
  useState,
} from 'react';
import {
  GroupChannel,
  GroupChannelUpdateParams,
} from '@sendbird/chat/groupChannel';

import useSendbirdStateContext from '../../../hooks/useSendbirdStateContext';
import { RenderUserProfileProps } from '../../../types';
import { UserProfileProvider } from '../../../lib/UserProfileContext';
import uuidv4 from '../../../utils/uuid';

interface ApplicationUserListQuery {
  limit?: number;
  userIdsFilter?: Array<string>;
  metaDataKeyFilter?: string;
  metaDataValuesFilter?: Array<string>;
}

interface ChannelSettingsQueries {
  applicationUserListQuery?: ApplicationUserListQuery;
}

type OverrideInviteUserType = {
  users: Array<string>;
  onClose: () => void;
  channel: GroupChannel;
};

export type ChannelSettingsContextProps = {
  children?: React.ReactElement;
  channelUrl: string;
  className?: string;
  onCloseClick?(): void;
  onLeaveChannel?(): void;
  overrideInviteUser?(params: OverrideInviteUserType): void;
  onChannelModified?(channel: GroupChannel): void;
  onBeforeUpdateChannel?(currentTitle: string, currentImg: File, data: string): GroupChannelUpdateParams;
  queries?: ChannelSettingsQueries;
  renderUserProfile?: (props: RenderUserProfileProps) => React.ReactElement;
  disableUserProfile?: boolean;
};

interface ChannelSettingsProviderInterface {
  channelUrl: string;
  onCloseClick?(): void;
  onLeaveChannel?(): void;
  overrideInviteUser?(params: OverrideInviteUserType): void;
  onChannelModified?(channel: GroupChannel): void;
  onBeforeUpdateChannel?(currentTitle: string, currentImg: File, data: string): GroupChannelUpdateParams;
  queries?: ChannelSettingsQueries;
  setChannelUpdateId(uniqId: string): void;
  forceUpdateUI(): void;
  channel: GroupChannel;
  invalidChannel: boolean;
}

const ChannelSettingsContext = React.createContext<ChannelSettingsProviderInterface|null>(undefined);

const ChannelSettingsProvider: React.FC<ChannelSettingsContextProps> = (props: ChannelSettingsContextProps) => {
  const {
    children,
    className,
    channelUrl,
    onCloseClick,
    onLeaveChannel,
    onChannelModified,
    overrideInviteUser,
    onBeforeUpdateChannel,
    queries,
  } = props;

  // fetch store from <SendbirdProvider />
  const globalStore = useSendbirdStateContext();
  const { config, stores } = globalStore;
  const { sdkStore } = stores;
  const { logger, onUserProfileMessage } = config;

  const { initialized } = sdkStore;
  const sdk = sdkStore?.sdk;

  // hack to keep track of channel updates by triggering useEffect
  const [channelUpdateId, setChannelUpdateId] = useState(uuidv4());
  const [channel, setChannel] = useState(null);
  const [invalidChannel, setInvalidChannel] = useState(false);

  const forceUpdateUI = () => {
    setChannelUpdateId(uuidv4());
  };

  useEffect(() => {
    logger.info('ChannelSettings: Setting up');
    if (!channelUrl || !initialized || !sdk) {
      logger.warning('ChannelSettings: Setting up failed', 'No channelUrl or sdk uninitialized');
      setInvalidChannel(false);
    } else {
      if (!sdk || !sdk.groupChannel) {
        logger.warning('ChannelSettings: No GroupChannel');
        return;
      }
      sdk.groupChannel.getChannel(channelUrl).then((groupChannel) => {
        if (!groupChannel) {
          logger.warning('ChannelSettings: Channel not found');
          setInvalidChannel(true);
        } else {
          logger.info('ChannelSettings: Fetched group channel', groupChannel);
          setInvalidChannel(false);
          setChannel(groupChannel);
        }
      });
    }
  }, [channelUrl, initialized, channelUpdateId]);

  return (
    <ChannelSettingsContext.Provider value={{
      channelUrl,
      onCloseClick,
      onLeaveChannel,
      onChannelModified,
      onBeforeUpdateChannel,
      queries,
      overrideInviteUser,
      setChannelUpdateId,
      forceUpdateUI,
      channel,
      invalidChannel,
    }}>
      <UserProfileProvider
        renderUserProfile={props?.renderUserProfile}
        disableUserProfile={props?.disableUserProfile ?? config?.disableUserProfile}
        onUserProfileMessage={onUserProfileMessage}
      >
        <div className={`sendbird-channel-settings ${className}`}>
          {children}
        </div>
      </UserProfileProvider>
    </ChannelSettingsContext.Provider>
  );
};

export type UseChannelSettingsType = () => ChannelSettingsProviderInterface;
const useChannelSettingsContext: UseChannelSettingsType = () => React.useContext(ChannelSettingsContext);

export {
  ChannelSettingsProvider,
  useChannelSettingsContext,
};
