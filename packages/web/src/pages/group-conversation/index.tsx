import { useParams } from "react-router-dom";
import ConversationFooter from "../conversation/ConversationFooter";
import ConversationList from "../conversation/ConversationList";
import { ConversationAPIProvider } from "../conversation/context";
import GroupConversationHeader from "./GroupConversationHeader";

const GroupConversation = () => {
	const { groupId = "" } = useParams<{ groupId: string }>();

	return (
		<ConversationAPIProvider key={`group:${groupId}`}>
			<GroupConversationHeader />
			<ConversationList />
			<ConversationFooter />
		</ConversationAPIProvider>
	);
};

export default GroupConversation;
