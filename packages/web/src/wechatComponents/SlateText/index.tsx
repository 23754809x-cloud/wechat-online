import { useCreation } from "ahooks";
import { memo } from "react";
import { type Descendant, createEditor } from "slate";
import { Editable, Slate, withReact } from "slate-react";
import { twMerge } from "tailwind-merge";

import Element, { type TElementOtherProps } from "./Element";
import { withInlines } from "./utils";

type Props = {
	content: Descendant[];
} & TElementOtherProps;

const SlateText = ({ content, classNames }: Props) => {
	const editor = useCreation(() => withInlines(withReact(createEditor())), []);

	return (
		<Slate editor={editor} initialValue={content} key={JSON.stringify(content)}>
			<Editable
				readOnly
				tabIndex={-1}
				renderElement={(props) => <Element {...props} readOnly classNames={classNames} />}
				className={twMerge("outline-none focus:outline-none", classNames?.base)}
			/>
		</Slate>
	);
};

export default memo(SlateText);
