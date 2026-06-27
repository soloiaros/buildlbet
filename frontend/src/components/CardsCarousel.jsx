import React from "react";
import TiltCard from "./TiltCard";
import attendeeImg from "../assets/attendee_card.png";
import builderImg from "../assets/builder_card.png";
import { Camera } from "lucide-react";
import "./CardsCarousel.css";

export default function CardsCarousel({ ownedCards, claimingCard, onClaimClick }) {
  // Determine which cards to show
  const cards = [];
  
  if (ownedCards?.joinCard) {
    cards.push({ id: 0, imageSrc: attendeeImg });
  }
  if (ownedCards?.threePostsCard) {
    cards.push({ id: 1, imageSrc: builderImg });
  }

  // Two dummy secret cards at the end
  const dummyCards = [
    { id: 'dummy1', isDummy: true },
    { id: 'dummy2', isDummy: true },
  ];

  return (
    <div className="cards-carousel-section brutal-card">
      <div className="carousel-header">
        <h2 className="carousel-title">YOUR COLLECTION</h2>
        <button className="btn btn-secondary" onClick={onClaimClick} disabled={claimingCard}>
          {claimingCard ? <span className="spinner" /> : <><Camera size={16} /> CLAIM</>}
        </button>
      </div>

      <div className="carousel-track">
        {cards.map((c) => (
          <TiltCard key={c.id} imageSrc={c.imageSrc} isDummy={false} />
        ))}
        {dummyCards.map((c) => (
          <TiltCard key={c.id} isDummy={true} />
        ))}
      </div>
    </div>
  );
}
