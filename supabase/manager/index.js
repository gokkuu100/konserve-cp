import AuthManager from './auth/AuthManager';
import ProfileManager from './auth/ProfileManager';
import MessageManager from './messaging/MessageManager';
import AgencyManager from './agency/AgencyManager';
import SubscriptionManager from './agency/SubscriptionManager';
import FeedbackManager from './agency/FeedbackManager';
import PointsManager from './rewards/PointsManager';
import LeaderboardManager from './rewards/LeaderboardManager';
import ConstituencyManager from './location/ConstituencyManager';

class SupabaseManager {
  constructor() {
    this.auth = AuthManager;
    this.profile = ProfileManager;
    this.messages = MessageManager;
    this.agency = AgencyManager;
    this.subscriptions = SubscriptionManager;
    this.feedback = FeedbackManager;
    this.points = PointsManager;
    this.leaderboard = LeaderboardManager;
    this.constituency = ConstituencyManager;
  }
}

export default new SupabaseManager();