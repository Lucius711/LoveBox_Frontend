import GiftSuggestionCard from './GiftSuggestionCard';
import DesignPromptCard   from './DesignPromptCard';
import BoxSizeCard        from './BoxSizeCard';
import OccasionGuideCard  from './OccasionGuideCard';
import PaymentGuideCard   from './PaymentGuideCard';

export default function RichCard({ card }) {
  if (!card?.type) return null;

  switch (card.type) {
    case 'gift_suggestion': return <GiftSuggestionCard card={card} />;
    case 'design_prompt':   return <DesignPromptCard card={card} />;
    case 'box_size_info':   return <BoxSizeCard card={card} />;
    case 'occasion_guide':  return <OccasionGuideCard card={card} />;
    case 'payment_guide':   return <PaymentGuideCard card={card} />;
    default: return null;
  }
}
