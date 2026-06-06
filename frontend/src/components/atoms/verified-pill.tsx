import { Badge } from './badge';
import { Icon } from './icon';

/** "Verified host" trust badge. */
export function VerifiedPill() {
  return (
    <Badge tone="verified">
      <Icon name="shield" size={13} stroke={1.8} />
      Verified host
    </Badge>
  );
}
