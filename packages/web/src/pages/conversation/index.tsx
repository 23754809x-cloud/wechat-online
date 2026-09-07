import { useParams } from "react-router-dom";
import ConversationFooter from "./ConversationFooter";
import ConversationHeader from "./ConversationHeader";
import ConversationList from "./ConversationList";
import { ConversationAPIProvider } from "./context";

const Conversation = () => {
	const { id = "" } = useParams<{ id: string }>();

	return (
		<ConversationAPIProvider key={`private:${id}`}>
			<div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#EDEDED]">
				<ConversationHeader />
				<ConversationList />
				<ConversationFooter />
			</div>
		</ConversationAPIProvider>
	);
};

export default Conversation;
