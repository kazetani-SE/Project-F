import { useParams } from 'react-router-dom';
import { SeriesDetail } from './components/SeriesDetail';

export function SeriesDetailPage() {
    const { id = '' } = useParams();
    return <SeriesDetail key={id} id={id} />;
}
